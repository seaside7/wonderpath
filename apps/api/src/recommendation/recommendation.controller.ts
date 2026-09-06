import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
