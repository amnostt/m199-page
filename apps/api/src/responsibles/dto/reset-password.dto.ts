/**
 * ResetPasswordDto — new password for another responsible user.
 *
 * AR-08: password reset by an authenticated responsible user.
 * Minimum 8 characters, matching the LoginDto constraint.
 */
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
