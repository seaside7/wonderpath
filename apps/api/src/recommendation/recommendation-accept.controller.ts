import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcceptRecommendationDto } from './dto/accept-recommendation.dto';
import { SessionFocusResponseDto } from './dto/session-focus-response.dto';
import { RecommendationService } from './recommendation.service';

@Controller('learning-sessions')
@UseGuards(JwtAuthGuard)
export class RecommendationAcceptController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post(':sessionId/recommendation/accept')
  accept(
    @Req() req: { user: { id: string } },
    @Param('sessionId') sessionId: string,
    @Body() dto: AcceptRecommendationDto,
  ): Promise<SessionFocusResponseDto> {
    return this.recommendationService.acceptRecommendation(
      req.user.id,
      sessionId,
      dto,
    );
  }
}
