import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an activity log entry. Called by other services — fire and forget.
   */
  log(
    workerId: string,
    type: ActivityType,
    title: string,
    description?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.activity.create({
      data: { workerId, type, title, description, metadata },
    });
  }

  /**
   * Verify the authenticated user owns the worker (via workspace ownership).
   * Used by the activities controller to guard the per-worker route.
   */
  async verifyWorkerOwnership(workerId: string, userId: string): Promise<void> {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      include: { workspace: true },
    });
    if (!worker) {
      throw new NotFoundException({ code: 'WORKER_NOT_FOUND', message: 'Worker not found.' });
    }
    if (worker.workspace.ownerId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have access to this worker.' });
    }
  }

  /**
   * List all activities for a specific worker (newest first, paginated).
   */
  listWorker(workerId: string, skip = 0, take = 20) {
    return this.prisma.activity.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 100),
    });
  }

  /**
   * List all activities across a workspace (newest first, paginated).
   */
  listWorkspace(workspaceId: string, skip = 0, take = 20) {
    return this.prisma.activity.findMany({
      where: { worker: { workspaceId } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 100),
    });
  }
}
