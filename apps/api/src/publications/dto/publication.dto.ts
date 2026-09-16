import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  Matches,
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
export enum ActivityStatus {
  UPCOMING = "UPCOMING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}
export enum DocumentationStatus {
  PENDING_DOCUMENTATION = "PENDING_DOCUMENTATION",
  DOCUMENTED = "DOCUMENTED",
}

const utcDate = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  return new Date(`${value}T00:00:00.000Z`);
};

export class CreatePublicationDto {
  @IsString() @MinLength(1) @Matches(URL_SAFE_SLUG_REGEX) slug!: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() excerpt!: string;
  @IsString() content!: string;
  @IsString() featuredImageId!: string;
  @IsEnum(PublicationType) type!: PublicationType;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
  @IsOptional() @IsDate() @Transform(utcDate) publishedAt?: Date;
  @IsOptional() @IsEnum(PublicationScope) scope?: PublicationScope;
  @IsOptional() @IsArray() @IsString({ each: true }) missionIds?: string[];
  @IsOptional() @Transform(utcDate) @IsDate() startDate?: Date;
  @IsOptional() @Transform(utcDate) @IsDate() endDate?: Date;
  @ValidateIf((o) => o.type !== PublicationType.POST)
  @IsEnum(ActivityStatus)
  activityStatus?: ActivityStatus;
  @ValidateIf((o) => o.type !== PublicationType.POST)
  @IsEnum(DocumentationStatus)
  documentationStatus?: DocumentationStatus;
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
  @IsOptional() @IsString() featuredImageId?: string;
  @IsOptional() @IsEnum(PublicationType) type?: PublicationType;
  @IsOptional() @IsEnum(PublicationStatus) status?: PublicationStatus;
  @IsOptional() @IsEnum(PublicationScope) scope?: PublicationScope;
  @IsOptional() @IsArray() @IsString({ each: true }) missionIds?: string[];
  @IsOptional() @Transform(utcDate) @IsDate() startDate?: Date | null;
  @IsOptional() @Transform(utcDate) @IsDate() endDate?: Date | null;
  @IsOptional() @IsEnum(ActivityStatus) activityStatus?: ActivityStatus | null;
  @IsOptional()
  @IsEnum(DocumentationStatus)
  documentationStatus?: DocumentationStatus | null;
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
