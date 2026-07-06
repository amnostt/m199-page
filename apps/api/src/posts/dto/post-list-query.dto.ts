/**
 * PostListQueryDto — query parameters for listing posts (Task 1.6).
 *
 * Optional status filter and pagination (skip/take).
 * All fields are optional; the service applies defaults.
 */
import { IsOptional, IsEnum } from "class-validator";

export class PostListQueryDto {
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: string;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}
