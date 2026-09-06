import { Module } from '@nestjs/common';
import { RecommendationAcceptController } from './recommendation-accept.controller';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  controllers: [RecommendationController, RecommendationAcceptController],
  providers: [RecommendationService],
})
export class RecommendationModule {}
