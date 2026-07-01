/**
 * CreateResponsibleDto — validated by global ValidationPipe.
 *
 * AR-06: receiving email + displayName + password for new responsible-user
 * creation. Mirrors the LoginDto validation pattern.
 */
import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateResponsibleDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
