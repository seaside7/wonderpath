import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';

@Module({
  imports: [AdminModule],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionBankModule {}
