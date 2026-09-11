import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { WorkersModule } from './workers/workers.module.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    WorkspacesModule,
    WorkersModule,
    KnowledgeModule,
    ConversationsModule,
    ActivitiesModule,
    RecommendationsModule,
    DashboardModule,
  ],
})
export class AppModule {}
