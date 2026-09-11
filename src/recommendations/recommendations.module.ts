import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ActivitiesModule } from '../activities/activities.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  imports: [AiModule, WorkspacesModule, ActivitiesModule, DatabaseModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
