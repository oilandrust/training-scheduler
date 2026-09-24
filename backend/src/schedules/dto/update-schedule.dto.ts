import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  weekendNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  zoomTopic?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  zoomMeetingId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  zoomPasscode?: string | null;
}
