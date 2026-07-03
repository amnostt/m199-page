/**
 * CreateOutingDto — validated input for outing creation.
 *
 * OUT-01: Required fields: title, slug, dateTime, location, description.
 * Optional: mainImageId, croquisId, planId, status (defaults to DRAFT via Prisma).
 */
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";

export class CreateOutingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  dateTime!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

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
