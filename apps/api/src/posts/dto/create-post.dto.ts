/**
 * CreatePostDto — validated input for post creation.
 *
 * Required: title, slug, content.
 * Optional: coverImageId, description, tags, downloadIds.
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

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "slug must be lowercase alphanumeric with optional hyphens (kebab-case)",
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

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
