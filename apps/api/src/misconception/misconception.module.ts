import { Module } from '@nestjs/common';
import { AdaptiveDifficultyController } from './adaptive-difficulty.controller';
import { MisconceptionController } from './misconception.controller';
import { MisconceptionService } from './misconception.service';

@Module({
  controllers: [MisconceptionController, AdaptiveDifficultyController],
  providers: [MisconceptionService],
  exports: [MisconceptionService],
})
export class MisconceptionModule {}
