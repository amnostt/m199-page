import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { URL_SAFE_SLUG_REGEX } from "../../common/validation/slug.js";

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(URL_SAFE_SLUG_REGEX)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  heroImageId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  profileImageId?: string;

  @IsString()
  @IsNotEmpty()
  heroPhrase!: string;
}
