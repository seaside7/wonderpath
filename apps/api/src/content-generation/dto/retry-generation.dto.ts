import { IsObject, IsOptional } from 'class-validator';

export class RetryGenerationDto {
  @IsOptional()
  @IsObject()
  providerOptions?: Record<string, unknown>;
}
