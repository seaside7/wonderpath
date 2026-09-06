import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningSessionController } from './learning-session.controller';
import { LearningSessionService } from './learning-session.service';

@Module({
  imports: [AuthModule],
  controllers: [LearningSessionController],
  providers: [LearningSessionService],
})
export class LearningSessionModule {}
