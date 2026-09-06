import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { QuestionPerformanceService } from './question-performance.service';

@Controller('admin/question-performance')
@UseGuards(AdminAuthGuard)
export class QuestionPerformanceController {
  constructor(
    private readonly questionPerformanceService: QuestionPerformanceService,
  ) {}

  @Get()
  list() {
    return this.questionPerformanceService.list();
  }
}
