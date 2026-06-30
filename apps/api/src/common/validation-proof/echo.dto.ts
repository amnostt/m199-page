/**
 * Echo DTO — internal ValidationPipe proof.
 *
 * Proves that global ValidationPipe + class-validator are wired correctly
 * without any product behavior.
 */
import { IsString } from "class-validator";

export class EchoDto {
  @IsString()
  message!: string;
}
