import { Module } from '@nestjs/common';
import { LearningPatternController } from './learning-pattern.controller';
import { LearningPatternService } from './learning-pattern.service';

@Module({
  controllers: [LearningPatternController],
  providers: [LearningPatternService],
  exports: [LearningPatternService],
})
export class LearningPatternModule {}
