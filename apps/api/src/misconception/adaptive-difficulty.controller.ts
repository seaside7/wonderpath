import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankSubject } from '../question-bank/enums/question-bank.enums';
import { MisconceptionService } from './misconception.service';

@Controller('children/:childId/adaptive-difficulty')
@UseGuards(JwtAuthGuard)
export class AdaptiveDifficultyController {
  constructor(private readonly misconceptionService: MisconceptionService) {}

  @Get()
  getAdaptiveDifficulty(
    @Req() req: Request,
    @Param('childId') childId: string,
    @Query('subject') subject?: string,
  ) {
    const parentId = (req.user as { id: string }).id;

    if (subject) {
      return this.misconceptionService.getAdaptiveDifficulty(
        parentId,
        childId,
        subject as BankSubject,
      );
    }

    return this.misconceptionService.getAdaptiveDifficultyList(
      parentId,
      childId,
    );
  }
}
