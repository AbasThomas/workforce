import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, WorkerStatus } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service.js';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import {
  ChatDto,
  CreateWorkerDto,
  GenerateWorkerDto,
  StatusDto,
  UpdateWorkerDto,
} from './dto.js';

/** Valid status transitions */
const STATUS_TRANSITIONS: Record<WorkerStatus, WorkerStatus[]> = {
  [WorkerStatus.DRAFT]: [WorkerStatus.ACTIVE],
  [WorkerStatus.ACTIVE]: [WorkerStatus.PAUSED, WorkerStatus.ARCHIVED],
  [WorkerStatus.PAUSED]: [WorkerStatus.ACTIVE, WorkerStatus.ARCHIVED],
  [WorkerStatus.ARCHIVED]: [],
};

/** Maximum number of recent conversation messages sent to the AI (cost control) */
const MAX_HISTORY_MESSAGES = 10;

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly activity: ActivitiesService,
    private readonly ai: AiService,
  ) {}

  // ---------------------------------------------------------------------------
  // Ownership helper — used by this service and by KnowledgeService
  // ---------------------------------------------------------------------------

  async owned(id: string, userId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: { workspace: true },
    });
    if (!worker) {
      throw new NotFoundException({ code: 'WORKER_NOT_FOUND', message: 'Worker not found.' });
    }
    if (worker.workspace.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this worker.',
      });
    }
    return worker;
  }

  // ---------------------------------------------------------------------------
  // AI worker generation — returns a preview, does NOT save to DB
  // ---------------------------------------------------------------------------

  async generate(userId: string, dto: GenerateWorkerDto) {
    await this.workspaces.owned(dto.workspaceId, userId);
    const preview = await this.ai.generateWorker(dto.jobDescription);

    // Log WORKER_GENERATED against an existing worker if one is available.
    // At this point no worker has been saved yet (this is a preview), so we
    // attach the activity to the most recent worker in the workspace if present.
    // If the workspace has no workers yet the event is omitted — the subsequent
    // POST /workers will create WORKER_CREATED which covers the audit trail.
    const anchor = await this.prisma.worker.findFirst({
      where: { workspaceId: dto.workspaceId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (anchor) {
      await this.activity.log(
        anchor.id,
        ActivityType.WORKER_GENERATED,
        'Worker configuration generated',
        `AI generated a "${preview.role}" worker named "${preview.name}".`,
        { role: preview.role, name: preview.name },
      );
    }

    return preview;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(userId: string, dto: CreateWorkerDto) {
    await this.workspaces.owned(dto.workspaceId, userId);
    const worker = await this.prisma.worker.create({ data: dto });
    await this.activity.log(
      worker.id,
      ActivityType.WORKER_CREATED,
      'Worker created',
      `${worker.name} (${worker.role}) was created.`,
    );
    return worker;
  }

  list(userId: string, workspaceId?: string, skip = 0, take = 20) {
    return this.prisma.worker.findMany({
      where: {
        workspace: { ownerId: userId },
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 100),
    });
  }

  get(id: string, userId: string) {
    return this.owned(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateWorkerDto) {
    await this.owned(id, userId);
    const worker = await this.prisma.worker.update({ where: { id }, data: dto });
    await this.activity.log(
      id,
      ActivityType.WORKER_UPDATED,
      'Worker updated',
      `${worker.name} was updated.`,
    );
    return worker;
  }

  async remove(id: string, userId: string) {
    await this.owned(id, userId);
    await this.prisma.worker.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  async status(id: string, userId: string, dto: StatusDto) {
    const worker = await this.owned(id, userId);

    const allowed = STATUS_TRANSITIONS[worker.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition a ${worker.status} worker to ${dto.status}.`,
      });
    }

    const updated = await this.prisma.worker.update({
      where: { id },
      data: { status: dto.status },
    });

    const activityType =
      dto.status === WorkerStatus.ACTIVE
        ? ActivityType.WORKER_ACTIVATED
        : dto.status === WorkerStatus.PAUSED
          ? ActivityType.WORKER_PAUSED
          : ActivityType.WORKER_ARCHIVED;

    await this.activity.log(
      id,
      activityType,
      `Worker ${dto.status.toLowerCase()}`,
      `${worker.name} status changed from ${worker.status} to ${dto.status}.`,
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  async chat(id: string, userId: string, dto: ChatDto) {
    const worker = await this.owned(id, userId);

    if (worker.status === WorkerStatus.ARCHIVED) {
      throw new BadRequestException({
        code: 'WORKER_ARCHIVED',
        message: 'Archived workers cannot receive new messages.',
      });
    }
    if (worker.status !== WorkerStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'WORKER_NOT_ACTIVE',
        message: 'Only active workers can receive chat messages.',
      });
    }

    // Find or create conversation
    let conversation;
    if (dto.conversationId) {
      conversation = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, workerId: id, userId },
      });
      if (!conversation) {
        throw new NotFoundException({
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found.',
        });
      }
    } else {
      conversation = await this.prisma.conversation.create({
        data: { workerId: id, userId },
      });
      await this.activity.log(
        id,
        ActivityType.CONVERSATION_STARTED,
        'Conversation started',
        `A new conversation was started with ${worker.name}.`,
      );
    }

    // Persist the incoming user message
    await this.prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: dto.message },
    });
    await this.activity.log(
      id,
      ActivityType.MESSAGE_RECEIVED,
      'Message received',
      `Customer sent: "${dto.message.substring(0, 80)}${dto.message.length > 80 ? '…' : ''}"`,
    );

    // Load worker knowledge
    const knowledge = await this.prisma.knowledge.findMany({
      where: { workerId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Load recent conversation history for context (cost control)
    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_MESSAGES,
    });
    const conversationHistory = recentMessages
      .reverse()
      .slice(0, -1) // exclude the message we just inserted
      .map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

    // Call the AI
    const result = await this.ai.chatWithWorker(
      {
        name: worker.name,
        role: worker.role,
        description: worker.description,
        instructions: worker.instructions,
        responsibilities: worker.responsibilities,
        knowledge,
      },
      dto.message,
      conversationHistory,
    );

    // Persist the worker response
    const workerMessage = await this.prisma.message.create({
      data: { conversationId: conversation.id, role: 'WORKER', content: result.response },
    });

    await this.activity.log(
      id,
      ActivityType.MESSAGE_SENT,
      'Answered customer message',
      `${worker.name} responded to: "${dto.message.substring(0, 60)}${dto.message.length > 60 ? '…' : ''}"`,
    );

    if (result.requiresEscalation) {
      await this.activity.log(
        id,
        ActivityType.ESCALATION,
        'Escalation required',
        result.escalationReason ?? 'Could not answer the customer request.',
      );
    }

    return {
      conversationId: conversation.id,
      message: workerMessage,
      requiresEscalation: result.requiresEscalation,
      ...(result.escalationReason ? { escalationReason: result.escalationReason } : {}),
    };
  }
}
