import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestionServingService } from './question-serving.service';

@Controller('learning-sessions')
@UseGuards(JwtAuthGuard)
export class QuestionServingController {
  constructor(
    private readonly questionServingService: QuestionServingService,
  ) {}

  @Get(':sessionId/next-question')
  getNextQuestion(
    @Req() req: { user: { id: string } },
    @Param('sessionId') sessionId: string,
  ) {
    return this.questionServingService.getNextQuestion(req.user.id, sessionId);
  }
}
