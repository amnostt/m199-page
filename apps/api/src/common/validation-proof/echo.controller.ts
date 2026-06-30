/**
 * Echo controller — internal ValidationPipe proof.
 *
 * Proves global ValidationPipe + class-validator are wired correctly
 * without any product behavior.
 */
import { Body, Controller, Post } from "@nestjs/common";
import { EchoDto } from "./echo.dto.js";

@Controller("echo")
export class EchoController {
  @Post()
  echo(@Body() dto: EchoDto): EchoDto {
    return dto;
  }
}
