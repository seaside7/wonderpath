import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Curriculum,
  Gender,
  Grade,
  PreferredLanguage,
} from '../enums/child.enums';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsEnum(Grade)
  grade: Grade;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Curriculum, { each: true })
  curricula: Curriculum[];

  @IsEnum(PreferredLanguage)
  preferredLanguage: PreferredLanguage;

  @IsOptional()
  @IsString()
  schoolName?: string;
}
