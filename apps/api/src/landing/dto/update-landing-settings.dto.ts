/**
 * UpdateLandingSettingsDto — partial update for landing settings.
 *
 * LP-01: All fields are optional strings. The service layer applies
 * a partial merge — omitted fields retain their current values.
 */
import { IsOptional, IsString, IsUrl, ValidateIf } from "class-validator";

export class UpdateLandingSettingsDto {
  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  heroImageId?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  vision?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ["http", "https"] },
    { message: "featuredVideoUrl must be a valid http or https URL" },
  )
  featuredVideoUrl?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
