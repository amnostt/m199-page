/**
 * CreateVerseDto — validated input for verse creation.
 *
 * Required: text, reference.
 * No date/time properties: the system captures one server instant
 * on create and derives both `publishedAt` (UTC) and `date` (America/Lima).
 */
import { IsString, IsNotEmpty } from "class-validator";

export class CreateVerseDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsString()
  @IsNotEmpty()
  reference!: string;
}
