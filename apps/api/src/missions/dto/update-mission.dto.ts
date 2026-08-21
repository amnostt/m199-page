import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
