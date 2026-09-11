import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service.js';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly ai: AiService,
    private readonly workspaces: WorkspacesService,
    private readonly activities: ActivitiesService,
    private readonly prisma: PrismaService,
  ) {}

  async analyze(userId: string, workspaceId: string, businessDescription: string) {
    await this.workspaces.owned(workspaceId, userId);

    const analysis = await this.ai.analyzeBusiness(businessDescription);

    // Log workforce analysis event — attach to the first worker in the workspace
    // if one exists, otherwise skip (no orphaned activity records).
    const firstWorker = await this.prisma.worker.findFirst({
      where: { workspaceId },
      select: { id: true },
    });
    if (firstWorker) {
      await this.activities.log(
        firstWorker.id,
        ActivityType.WORKFORCE_ANALYZED,
        'Workforce analysis completed',
        `Identified ${analysis.recommendations.length} potential AI worker(s) for this workspace.`,
        { workspaceId, recommendationCount: analysis.recommendations.length },
      );
    }

    return analysis;
  }
}
