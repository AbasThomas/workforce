import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, JwtUser } from '../common/auth.js';
import { AnalyzeDto } from './dto.js';
import { RecommendationsService } from './recommendations.service.js';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze a business and get AI workforce recommendations',
    description:
      'Describe your business in natural language. The AI will identify repetitive ' +
      'tasks and recommend specialized AI workers. Returns a preview — workers are ' +
      'not created automatically.',
  })
  analyze(@CurrentUser() u: JwtUser, @Body() d: AnalyzeDto) {
    return this.service.analyze(u.id, d.workspaceId, d.businessDescription);
  }
}
