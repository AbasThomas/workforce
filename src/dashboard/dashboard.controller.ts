import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, JwtUser } from '../common/auth.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get workspace dashboard overview',
    description: 'Returns worker counts, conversation/message totals, escalation count, and recent activity.',
  })
  @ApiQuery({ name: 'workspaceId', required: true, description: 'Workspace to scope the overview to' })
  overview(@CurrentUser() u: JwtUser, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'workspaceId query parameter is required.',
      });
    }
    return this.service.overview(u.id, workspaceId);
  }
}
