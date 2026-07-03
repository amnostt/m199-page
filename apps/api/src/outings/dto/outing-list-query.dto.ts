/**
 * OutingListQueryDto — query parameters for listing outings.
 *
 * Optional status filter and pagination (skip/take). All fields
 * are optional; the service applies defaults and numeric parsing.
 */
import { IsOptional, IsEnum } from "class-validator";

export class OutingListQueryDto {
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: string;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}
