/**
 * Health controller — process/config readiness only (BF-05).
 *
 * Reports uptime and NODE_ENV via ConfigService. Zero DB access —
 * succeeds without database connectivity.
 */
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller("health")
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check() {
    return {
      status: "ok",
      uptime: process.uptime(),
      env: this.config.get<string>("NODE_ENV", "unknown"),
    };
  }
}
