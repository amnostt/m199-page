/**
 * UpdatePostDto — partial update for posts (Task 1.5).
 *
 * All CreatePostDto fields are optional. Only provided fields
 * trigger updates; omitted fields retain their current values.
 */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  Matches,
  ValidateIf,
} from "class-validator";
import { IsAbsent } from "./is-absent.decorator.js";
import { DownloadLabels } from "./download-labels.decorator.js";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "slug must be lowercase alphanumeric with optional hyphens (kebab-case)",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  downloadIds?: string[];

  @ValidateIf((o) => o.downloadLabels !== undefined)
  @DownloadLabels()
  downloadLabels?: Record<string, string>;

  @IsAbsent()
  declare status?: never;

  @IsAbsent()
  declare publishedAt?: never;
}
