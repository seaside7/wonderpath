import 'dotenv/config';
import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChildModule } from './child/child.module';
import { ContentGenerationModule } from './atlas/content-generation/content-generation.module';
import { ExamPrepModule } from './atlas/exam-prep/exam-prep.module';
import { LearningSessionModule } from './learning-session/learning-session.module';
import { LearningPatternModule } from './atlas/learning-pattern/learning-pattern.module';
import { MisconceptionModule } from './atlas/misconception/misconception.module';
import { QuestionPerformanceModule } from './atlas/question-performance/question-performance.module';
import { ParentModule } from './parent/parent.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { QuestionServingModule } from './atlas/question-serving/question-serving.module';
import { RecommendationModule } from './atlas/recommendation/recommendation.module';
import { StudentModelModule } from './atlas/student-model/student-model.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    ParentModule,
    ChildModule,
    LearningSessionModule,
    QuestionBankModule,
    StudentModelModule,
    RecommendationModule,
    ContentGenerationModule,
    MisconceptionModule,
    LearningPatternModule,
    QuestionPerformanceModule,
    ExamPrepModule,
    QuestionServingModule,
  ],
})
export class AppModule {}
