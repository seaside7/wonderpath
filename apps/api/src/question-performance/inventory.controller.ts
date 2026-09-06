import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { QuestionPerformanceService } from './question-performance.service';

@Controller('admin/inventory')
@UseGuards(AdminAuthGuard)
export class InventoryController {
  constructor(
    private readonly questionPerformanceService: QuestionPerformanceService,
  ) {}

  @Get()
  getInventory() {
    return this.questionPerformanceService.getInventory();
  }

  @Post('replenish')
  @HttpCode(HttpStatus.OK)
  replenish() {
    return this.questionPerformanceService.replenish();
  }
}
