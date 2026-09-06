import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { LearningPatternService } from './learning-pattern.service';

@Controller('children/:childId')
@UseGuards(JwtAuthGuard)
export class LearningPatternController {
  constructor(
    private readonly learningPatternService: LearningPatternService,
  ) {}

  @Get('learning-patterns')
  getPatterns(@Req() req: Request, @Param('childId') childId: string) {
    return this.learningPatternService.getPatterns(
      (req.user as { id: string }).id,
      childId,
    );
  }

  @Get('personality')
  getPersonality(@Req() req: Request, @Param('childId') childId: string) {
    return this.learningPatternService.getPersonality(
      (req.user as { id: string }).id,
      childId,
    );
  }

  @Patch('personality')
  updatePersonality(
    @Req() req: Request,
    @Param('childId') childId: string,
    @Body() dto: UpdatePersonalityDto,
  ) {
    return this.learningPatternService.updatePersonality(
      (req.user as { id: string }).id,
      childId,
      dto,
    );
  }

  @Get('encouragement')
  getEncouragement(@Req() req: Request, @Param('childId') childId: string) {
    return this.learningPatternService.getEncouragement(
      (req.user as { id: string }).id,
      childId,
    );
  }
}
