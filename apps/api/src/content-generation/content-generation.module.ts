import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ContentGenerationController } from './content-generation.controller';
import { ContentGenerationService } from './content-generation.service';
import { ContentGenerationServiceToken as ContentGeneratorToken } from './content-generation.tokens';
import { LlmContentGenerator } from './providers/llm-content-generator';
import { MockContentGenerator } from './providers/mock-content-generator';

const PROVIDER_DEFAULTS: Record<
  string,
  { baseUrl: string; apiKeyEnv: string; modelEnv: string; defaultModel: string }
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyEnv: 'ATLAS_OPENAI_API_KEY',
    modelEnv: 'ATLAS_OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/chat/completions',
    apiKeyEnv: 'ATLAS_DEEPSEEK_API_KEY',
    modelEnv: 'ATLAS_DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
  },
};

function createContentGenerator() {
  const mode = (process.env.ATLAS_CONTENT_PROVIDER ?? 'mock').toLowerCase();
  const providerConfig = PROVIDER_DEFAULTS[mode];

  if (providerConfig) {
    return new LlmContentGenerator({
      provider: mode,
      apiKey: process.env[providerConfig.apiKeyEnv] ?? '',
      baseUrl: providerConfig.baseUrl,
      model: process.env[providerConfig.modelEnv] ?? providerConfig.defaultModel,
    });
  }

  return new MockContentGenerator();
}

@Module({
  imports: [AdminModule],
  controllers: [ContentGenerationController],
  providers: [
    ContentGenerationService,
    {
      provide: ContentGeneratorToken,
      useFactory: createContentGenerator,
    },
  ],
  exports: [ContentGenerationService],
})
export class ContentGenerationModule {}
