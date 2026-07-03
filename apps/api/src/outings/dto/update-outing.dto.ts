/**
 * UpdateOutingDto — partial update for outings.
 *
 * All CreateOutingDto fields are optional. Only provided fields
 * trigger updates; omitted fields retain their current values.
 */
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class UpdateOutingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  mainImageId?: string;

  @IsOptional()
  @IsString()
  croquisId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: string;
}
