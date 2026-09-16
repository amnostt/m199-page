import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";
import { URL_SAFE_SLUG_REGEX } from "../../common/validation/slug.js";

export enum PublicationType {
  POST = "POST",
  OUTING = "OUTING",
  EVENT = "EVENT",
}
export enum PublicationStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}
export enum PublicationScope {
  GENERAL = "GENERAL",
  MISSION = "MISSION",
}

export const CIVIL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePublicationDto {
  @IsString() @MinLength(1) @Matches(URL_SAFE_SLUG_REGEX) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() excerpt!: string;
  @IsString() content!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  imageIds!: string[];
  @IsEnum(PublicationType) type!: PublicationType;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
  @ValidateIf((o) => o.type !== PublicationType.POST)
  @IsString()
  @Matches(CIVIL_DATE_REGEX)
  activityDate?: string;
  @IsOptional() @IsEnum(PublicationScope) scope?: PublicationScope;
  @IsOptional() @IsArray() @IsString({ each: true }) missionIds?: string[];
}

export class UpdatePublicationDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @Matches(URL_SAFE_SLUG_REGEX)
  slug?: string;
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  imageIds?: string[];
  @IsOptional() @IsEnum(PublicationType) type?: PublicationType;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
  @IsOptional() @IsString() @Matches(CIVIL_DATE_REGEX) activityDate?:
    string | null;
  @IsOptional() @IsEnum(PublicationScope) scope?: PublicationScope;
  @IsOptional() @IsArray() @IsString({ each: true }) missionIds?: string[];
  @IsOptional() @IsBoolean() confirmTypeChange?: boolean;
}

export class UpdatePublicationStatusDto {
  @IsEnum(PublicationStatus) status!: PublicationStatus;
}
export class PublicationScopeDto {
  @IsEnum(PublicationScope) scope!: PublicationScope;
  @IsArray() @IsString({ each: true }) missionIds!: string[];
}
export class PublicationQueryDto {
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
}
