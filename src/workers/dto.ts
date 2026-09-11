import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class GenerateWorkerDto {
  @ApiProperty({
    example: 'clxyz123workspaceid',
    description: 'ID of the workspace to generate the worker for',
  })
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    example:
      'I run an online clothing store and need someone to answer customer questions about products, delivery, and returns.',
    description: 'Natural-language description of the job the worker should do',
    minLength: 20,
    maxLength: 4000,
  })
  @IsString()
  @Length(20, 4000)
  jobDescription!: string;
}

export class CreateWorkerDto {
  @ApiProperty({ example: 'clxyz123workspaceid', description: 'Workspace this worker belongs to' })
  @IsString()
  workspaceId!: string;

  @ApiProperty({ example: 'Store Assistant', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ example: 'Customer Support Worker', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100)
  role!: string;

  @ApiProperty({
    example: 'Handles customer questions for an online clothing store.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @Length(10, 1000)
  description!: string;

  @ApiProperty({
    example: 'You are Store Assistant, a professional customer support worker...',
    description: 'System instructions that define how the worker behaves',
    minLength: 10,
    maxLength: 8000,
  })
  @IsString()
  @Length(10, 8000)
  instructions!: string;

  @ApiProperty({
    example: ['Answer product questions', 'Explain delivery', 'Escalate complex issues'],
    description: 'List of responsibilities (max 20)',
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  responsibilities!: string[];

  @ApiProperty({
    example: ['Customer support', 'Product recommendations'],
    description: 'List of skills (max 20)',
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills!: string[];
}

export class UpdateWorkerDto {
  @ApiPropertyOptional({ example: 'Store Assistant Pro', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'Senior Customer Support Worker' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instructions?: string;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class StatusDto {
  @ApiProperty({
    enum: WorkerStatus,
    example: WorkerStatus.ACTIVE,
    description: 'Target status. Valid transitions: DRAFT→ACTIVE, ACTIVE→PAUSED, PAUSED→ACTIVE, ACTIVE/PAUSED→ARCHIVED',
  })
  @IsEnum(WorkerStatus)
  status!: WorkerStatus;
}

export class ChatDto {
  @ApiProperty({
    example: 'Do you deliver to Lagos?',
    description: 'The message to send to the worker',
    minLength: 1,
    maxLength: 4000,
  })
  @IsString()
  @Length(1, 4000)
  message!: string;

  @ApiPropertyOptional({
    example: 'clxyz123convoid',
    description: 'Existing conversation ID to continue. Omit to start a new conversation.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
