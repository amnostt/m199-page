/**
 * Validation-proof module — internal scaffolding.
 *
 * Proves global ValidationPipe + class-validator wiring without product behavior.
 */
import { Module } from "@nestjs/common";
import { EchoController } from "./echo.controller.js";

@Module({
  controllers: [EchoController],
})
export class ValidationProofModule {}
