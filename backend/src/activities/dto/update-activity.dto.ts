import { ActivityKind } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  startMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  endMinutes?: number;

  @IsOptional()
  @IsEnum(ActivityKind)
  kind?: ActivityKind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  room?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  facilitator?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  breakoutNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string | null;
}
