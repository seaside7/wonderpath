import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { PreferredLanguage } from '../../../child/enums/child.enums';

export class RetryGenerationDto {
  @IsOptional()
  @IsObject()
  providerOptions?: Record<string, unknown>;

  /**
   * Optional override for the stored generation language. If omitted,
   * retry() falls back to whatever language the original request used
   * (read from generationMetadata), not English.
   */
  @IsOptional()
  @IsEnum(PreferredLanguage)
  language?: PreferredLanguage;
}
