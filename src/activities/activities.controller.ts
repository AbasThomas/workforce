import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, JwtUser } from '../common/auth.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { ActivitiesService } from './activities.service.js';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ActivitiesController {
  constructor(
    private readonly activities: ActivitiesService,
    private readonly workspaces: WorkspacesService,
  ) {}

  /**
   * GET /activities?workspaceId=&skip=0&take=20
   * List all activities for a workspace (newest first).
   */
  @Get('activities')
  @ApiOperation({ summary: 'List activities for a workspace' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async listWorkspace(
    @CurrentUser() u: JwtUser,
    @Query('workspaceId') workspaceId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    if (!workspaceId) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'workspaceId query parameter is required.',
      });
    }
    await this.workspaces.owned(workspaceId, u.id);
    return this.activities.listWorkspace(workspaceId, +skip, +take);
  }

  /**
   * GET /workers/:id/activities?skip=0&take=20
   * List activities for a specific worker (newest first).
   */
  @Get('workers/:id/activities')
  @ApiOperation({ summary: 'List activities for a worker' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  async listWorker(
    @CurrentUser() u: JwtUser,
    @Param('id') workerId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    // Verify the worker belongs to the authenticated user before returning data
    await this.activities.verifyWorkerOwnership(workerId, u.id);
    return this.activities.listWorker(workerId, +skip, +take);
  }
}
