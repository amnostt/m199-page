/**
 * Health module — exposes GET /health for process/config readiness (BF-05).
 *
 * Zero database dependencies. ConfigService is provided by the global
 * ConfigModule registered in AppModule.
 */
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
