import { IsNotEmpty, IsString } from "class-validator";

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

  @IsString()
  @IsNotEmpty()
  heroPhrase!: string;
}
