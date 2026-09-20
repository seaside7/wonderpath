import { Module } from '@nestjs/common';
import { ContentGenerationModule } from '../content-generation/content-generation.module';
import { InventoryController } from './inventory.controller';
import { QuestionPerformanceController } from './question-performance.controller';
import { QuestionPerformanceService } from './question-performance.service';

@Module({
  imports: [ContentGenerationModule],
  controllers: [QuestionPerformanceController, InventoryController],
  providers: [QuestionPerformanceService],
  exports: [QuestionPerformanceService],
})
export class QuestionPerformanceModule {}
