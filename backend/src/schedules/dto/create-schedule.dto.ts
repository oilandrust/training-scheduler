import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  weekendNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trainingName?: string;
}
