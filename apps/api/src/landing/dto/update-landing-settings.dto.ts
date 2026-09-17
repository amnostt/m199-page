/**
 * UpdateLandingSettingsDto — partial update for landing settings.
 *
 * LP-01: All fields are optional strings. The service layer applies
 * a partial merge — omitted fields retain their current values.
 */
import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateLandingSettingsDto {
  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  heroImageId?: string | null;

  @IsOptional()
  @IsString()
  missionsTitle?: string;

  @IsOptional()
  @IsString()
  missionsDescription?: string;

  @IsOptional()
  @IsString()
  publicationsTitle?: string;

  @IsOptional()
  @IsString()
  publicationsDescription?: string;

  @IsOptional()
  @IsString()
  aboutTitle?: string;

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
  @IsString()
  contactTitle?: string;

  @IsOptional()
  @IsString()
  contactDescription?: string;

  @IsOptional()
  @IsUrl(
    { protocols: ["http", "https"] },
    { message: "featuredVideoUrl must be a valid http or https URL" },
  )
  featuredVideoUrl?: string | null;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  verseText?: string;

  @IsOptional()
  @IsString()
  verseReference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  visualBreakImageId?: string | null;
}
