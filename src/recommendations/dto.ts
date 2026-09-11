import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AnalyzeDto {
  @ApiProperty({
    description: 'The workspace ID to scope this analysis to.',
    example: 'clxyz123workspaceid',
  })
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    description: 'Natural-language description of your business and the tasks you do regularly.',
    example:
      'I run an online fashion store. I receive lots of customer questions, spend time following up with interested buyers, and constantly check order statuses.',
    minLength: 20,
    maxLength: 4000,
  })
  @IsString()
  @Length(20, 4000)
  businessDescription!: string;
}
