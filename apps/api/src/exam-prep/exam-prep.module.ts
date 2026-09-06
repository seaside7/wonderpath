import { Module } from '@nestjs/common';
import { EXAM_EXTRACTION_PROVIDER } from './exam-extraction.provider';
import { ExamPrepController } from './exam-prep.controller';
import { ExamPrepService } from './exam-prep.service';
import { MockExamExtractionProvider } from './providers/mock-exam-extraction.provider';

@Module({
  controllers: [ExamPrepController],
  providers: [
    ExamPrepService,
    {
      provide: EXAM_EXTRACTION_PROVIDER,
      useClass: MockExamExtractionProvider,
    },
  ],
})
export class ExamPrepModule {}
