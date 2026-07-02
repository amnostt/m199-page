/**
 * LandingAdminController — protected admin settings CRUD (LP-01).
 *
 * GET  /landing/admin — reads singleton landing settings.
 * PUT  /landing/admin — upserts singleton landing settings.
 *
 * Protected by AuthGuard at controller level: only authenticated
 * ACTIVE responsible users may access these endpoints.
 * Unauthenticated requests receive 401.
 */
import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  ValidationPipe,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { UpdateLandingSettingsDto } from "./dto/update-landing-settings.dto.js";
import { LandingService } from "./landing.service.js";
import type { LandingSettingsRow } from "./landing.service.js";

@Controller("landing/admin")
@UseGuards(AuthGuard)
export class LandingAdminController {
  constructor(
    @Inject(LandingService) private readonly landingService: LandingService,
  ) {}

  /**
   * Reads the singleton landing settings (LP-01).
   *
   * Returns the current LandingSettings row, or null if no settings
   * have been created yet.
   */
  @Get()
  async getSettings(): Promise<LandingSettingsRow | null> {
    return this.landingService.getSettings();
  }

  /**
   * Upserts the singleton landing settings (LP-01).
   *
   * Accepts a partial DTO — only provided fields are applied;
   * omitted fields retain their current values (partial merge).
   */
  @Put()
  async updateSettings(
    @Body(
      new ValidationPipe({
        expectedType: UpdateLandingSettingsDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateLandingSettingsDto,
  ): Promise<LandingSettingsRow> {
    return this.landingService.updateSettings(dto);
  }
}
