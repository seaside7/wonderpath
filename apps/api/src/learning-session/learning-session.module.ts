import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningSessionController } from './learning-session.controller';
import { LearningSessionService } from './learning-session.service';
import { SessionHistoryController } from './session-history.controller';

@Module({
  imports: [AuthModule],
  controllers: [LearningSessionController, SessionHistoryController],
  providers: [LearningSessionService],
})
export class LearningSessionModule {}
