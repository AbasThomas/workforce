import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { ActivitiesService } from './activities.service.js';
import { ActivitiesController } from './activities.controller.js';

@Module({
  imports: [DatabaseModule, WorkspacesModule],
  providers: [ActivitiesService],
  controllers: [ActivitiesController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
