import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCurrentLearningSessionQueryDto } from './dto/get-current-learning-session-query.dto';
import { LearningSessionResponseDto } from './dto/learning-session-response.dto';
import { StartLearningSessionDto } from './dto/start-learning-session.dto';
import { LearningSessionService } from './learning-session.service';

@Controller('learning-sessions')
@UseGuards(JwtAuthGuard)
export class LearningSessionController {
  constructor(
    private readonly learningSessionService: LearningSessionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  start(
    @Req() req: { user: { id: string } },
    @Body() dto: StartLearningSessionDto,
  ): Promise<LearningSessionResponseDto> {
    return this.learningSessionService.start(req.user.id, dto);
  }

  @Get('current')
  getCurrent(
    @Req() req: { user: { id: string } },
    @Query() query: GetCurrentLearningSessionQueryDto,
  ): Promise<LearningSessionResponseDto> {
    return this.learningSessionService.getCurrent(req.user.id, query.childId);
  }

  @Post(':sessionId/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Req() req: { user: { id: string } },
    @Param('sessionId') sessionId: string,
  ): Promise<LearningSessionResponseDto> {
    return this.learningSessionService.complete(req.user.id, sessionId);
  }
}
