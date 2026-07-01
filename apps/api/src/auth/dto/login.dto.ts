/**
 * Login DTO — validated by global ValidationPipe.
 *
 * Enforces AR-01 input constraints: valid email and password ≥ 8 chars.
 */
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
