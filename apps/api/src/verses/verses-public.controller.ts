/**
 * VersesPublicController — public verse history.
 *
 * GET /verses/history — returns up to 100 previous remaining published
 * verses excluding the current latest, ordered by publishedAt desc.
 *
 * No auth guard — public routes by design.
 */
import { Controller, Get, Inject } from "@nestjs/common";
import { VersesService } from "./verses.service.js";
import type { VersePublicResponse } from "./verses.service.js";

@Controller("verses")
export class VersesPublicController {
  constructor(
    @Inject(VersesService)
    private readonly versesService: VersesService,
  ) {}

  /**
   * Returns previous published verses (excluding the latest).
   */
  @Get("history")
  async getHistory(): Promise<VersePublicResponse[]> {
    const rows = await this.versesService.getHistory();
    return rows.map((row) => ({
      id: row.id,
      text: row.text,
      reference: row.reference,
      date: row.date.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }
}
