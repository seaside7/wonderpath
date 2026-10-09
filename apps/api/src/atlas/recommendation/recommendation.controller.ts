import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChildTopicsResponseDto } from './dto/child-topics-response.dto';
import { GetChildTopicsQueryDto } from './dto/get-child-topics-query.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { RecommendationService } from './recommendation.service';

@Controller('children')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get(':childId/recommendations')
  getRecommendations(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations(req.user.id, childId);
  }

  @Get(':childId/topics')
  getTopics(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
    @Query() query: GetChildTopicsQueryDto,
  ): Promise<ChildTopicsResponseDto> {
    return this.recommendationService.getChildTopics(
      req.user.id,
      childId,
      query,
    );
  }
}
