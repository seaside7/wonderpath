import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListLearningSessionsQueryDto } from './dto/list-learning-sessions-query.dto';
import { SessionHistoryResponseDto } from './dto/session-history-response.dto';
import { LearningSessionService } from './learning-session.service';

const DEFAULT_HISTORY_LIMIT = 10;

@Controller('children')
@UseGuards(JwtAuthGuard)
export class SessionHistoryController {
  constructor(
    private readonly learningSessionService: LearningSessionService,
  ) {}

  @Get(':childId/learning-sessions')
  listForChild(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
    @Query() query: ListLearningSessionsQueryDto,
  ): Promise<SessionHistoryResponseDto> {
    return this.learningSessionService.listForChild(
      req.user.id,
      childId,
      query.limit ?? DEFAULT_HISTORY_LIMIT,
    );
  }
}
