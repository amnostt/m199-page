import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { IsEnum } from "class-validator";
import { PublicationType } from "./publication.dto.js";

export class ListPublicationsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 10;
  @IsOptional() @IsEnum(PublicationType) type?: PublicationType;
}
