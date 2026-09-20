import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MotivationStyle } from '../enums/learning-pattern.enums';

export class UpdatePersonalityDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  favoriteAnimal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  favoriteTheme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  favoriteColor?: string;

  @IsOptional()
  @IsIn(Object.values(MotivationStyle))
  motivationStyle?: MotivationStyle;
}
