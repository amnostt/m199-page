import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from "class-validator";
import { URL_SAFE_SLUG_REGEX } from "../../common/validation/slug.js";

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(URL_SAFE_SLUG_REGEX)
  slug?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  heroImageId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  profileImageId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  heroPhrase?: string;
}
