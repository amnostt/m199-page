/**
 * LandingPublicController — public landing payload assembly (LP-02).
 *
 * GET /landing/public — assembles hero, featured posts, featured outing,
 * and current verse into a single JSON payload with null-safe fallbacks.
 *
 * No auth guard — the landing page is public by design.
 * Missing or null sections return null/empty arrays, never server errors.
 */
import { Controller, Get, Inject } from "@nestjs/common";
import { LandingService } from "./landing.service.js";
import type { LandingPublicPayload } from "./landing.service.js";

@Controller("landing/public")
export class LandingPublicController {
  constructor(
    @Inject(LandingService) private readonly landingService: LandingService,
  ) {}

  /**
   * Assembles the full public landing payload (LP-02).
   *
   * Aggregates settings, featured posts (PUBLISHED only),
   * featured outing (PUBLISHED guard), and current verse (PUBLISHED, date desc)
   * into a single response. Never throws — null sections return null.
   */
  @Get()
  async getPublicPayload(): Promise<LandingPublicPayload> {
    return this.landingService.getPublicPayload();
  }
}
