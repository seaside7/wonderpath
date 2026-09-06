import { Module } from '@nestjs/common';
import { QuestionServingController } from './question-serving.controller';
import { QuestionServingService } from './question-serving.service';

@Module({
  controllers: [QuestionServingController],
  providers: [QuestionServingService],
})
export class QuestionServingModule {}
