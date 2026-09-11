import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, JwtUser } from '../common/auth.js';
import {
  ChatDto,
  CreateWorkerDto,
  GenerateWorkerDto,
  StatusDto,
  UpdateWorkerDto,
} from './dto.js';
import { WorkersService } from './workers.service.js';

@ApiTags('Workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly service: WorkersService) {}

  /** Generate a worker preview from a job description (does not save). */
  @Post('generate')
  @ApiOperation({ summary: 'Generate a worker preview from a job description' })
  generate(@CurrentUser() u: JwtUser, @Body() d: GenerateWorkerDto) {
    return this.service.generate(u.id, d);
  }

  /** Create and persist a worker (after user confirms the preview). */
  @Post()
  @ApiOperation({ summary: 'Create a worker' })
  create(@CurrentUser() u: JwtUser, @Body() d: CreateWorkerDto) {
    return this.service.create(u.id, d);
  }

  /** List workers, optionally filtered by workspace. */
  @Get()
  @ApiOperation({ summary: 'List workers' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  list(
    @CurrentUser() u: JwtUser,
    @Query('workspaceId') workspaceId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.service.list(u.id, workspaceId, +skip, +take);
  }

  /** Get a single worker by ID. */
  @Get(':id')
  @ApiOperation({ summary: 'Get a worker by ID' })
  get(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.service.get(id, u.id);
  }

  /** Update a worker's details. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a worker' })
  update(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
    @Body() d: UpdateWorkerDto,
  ) {
    return this.service.update(id, u.id, d);
  }

  /** Delete a worker. */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a worker' })
  remove(@CurrentUser() u: JwtUser, @Param('id') id: string) {
    return this.service.remove(id, u.id);
  }

  /** Transition worker status (DRAFT→ACTIVE, ACTIVE→PAUSED, etc.). */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update worker status' })
  status(
    @CurrentUser() u: JwtUser,
    @Param('id') id: string,
    @Body() d: StatusDto,
  ) {
    return this.service.status(id, u.id, d);
  }

  /** Send a message to an active worker. */
  @Post(':id/chat')
  @ApiOperation({ summary: 'Chat with a worker' })
  chat(@CurrentUser() u: JwtUser, @Param('id') id: string, @Body() d: ChatDto) {
    return this.service.chat(id, u.id, d);
  }
}
