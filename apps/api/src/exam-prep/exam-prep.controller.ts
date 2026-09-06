import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExamPrepDto, UploadExamMaterialDto } from './dto/exam-prep.dto';
import { ReviewExamTopicDto } from './dto/review-exam-topic.dto';
import { ExamPrepService } from './exam-prep.service';

@Controller('exam-prep')
@UseGuards(JwtAuthGuard)
export class ExamPrepController {
  constructor(private readonly examPrepService: ExamPrepService) {}

  @Post()
  createPlan(@Req() req: Request, @Body() dto: CreateExamPrepDto) {
    return this.examPrepService.createPlan(
      (req.user as { id: string }).id,
      dto,
    );
  }

  @Get(':planId')
  getPlan(@Req() req: Request, @Param('planId') planId: string) {
    return this.examPrepService.getPlan(
      (req.user as { id: string }).id,
      planId,
    );
  }

  @Post(':planId/materials')
  uploadMaterial(
    @Req() req: Request,
    @Param('planId') planId: string,
    @Body() dto: UploadExamMaterialDto,
  ) {
    return this.examPrepService.uploadMaterial(
      (req.user as { id: string }).id,
      planId,
      dto,
    );
  }

  @Patch(':planId/topics/:topicId')
  reviewTopic(
    @Req() req: Request,
    @Param('planId') planId: string,
    @Param('topicId') topicId: string,
    @Body() dto: ReviewExamTopicDto,
  ) {
    return this.examPrepService.reviewTopic(
      (req.user as { id: string }).id,
      planId,
      topicId,
      dto.action,
    );
  }

  @Get(':planId/plan')
  buildPriorityPlan(@Req() req: Request, @Param('planId') planId: string) {
    return this.examPrepService.buildPriorityPlan(
      (req.user as { id: string }).id,
      planId,
    );
  }
}
