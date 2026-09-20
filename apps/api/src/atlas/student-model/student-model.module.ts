import { Module } from '@nestjs/common';
import { LearningPatternModule } from '../learning-pattern/learning-pattern.module';
import { MisconceptionModule } from '../misconception/misconception.module';
import { QuestionPerformanceModule } from '../question-performance/question-performance.module';
import { AttemptController } from './attempt.controller';
import { MasteryController } from './mastery.controller';
import { StudentModelService } from './student-model.service';

@Module({
  imports: [
    MisconceptionModule,
    LearningPatternModule,
    QuestionPerformanceModule,
  ],
  controllers: [AttemptController, MasteryController],
  providers: [StudentModelService],
})
export class StudentModelModule {}
