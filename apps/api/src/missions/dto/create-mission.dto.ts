import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
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
