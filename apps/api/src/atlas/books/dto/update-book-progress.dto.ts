import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum BookReadingMode {
  Listen = 'LISTEN',
  Read = 'READ',
}

export class UpdateBookProgressDto {
  @IsEnum(BookReadingMode)
  mode: BookReadingMode;

  @IsInt()
  @Min(1)
  lastPage: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
