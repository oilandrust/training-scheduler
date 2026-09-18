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

export class CreateActivityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsInt()
  @Min(0)
  @Max(24 * 60)
  startMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(24 * 60)
  endMinutes!: number;

  @IsOptional()
  @IsEnum(ActivityKind)
  kind?: ActivityKind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  room?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  facilitator?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  breakoutNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;
}
