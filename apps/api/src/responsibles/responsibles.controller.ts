/**
 * ResponsiblesController — CRUD and password-reset for responsible users.
 *
 * All routes are behind AuthGuard (AR-09: no public registration).
 * Any authenticated active user has equal access — no role check (AR-10).
 *
 * The controller stays thin: it accepts validated DTOs and delegates
 * to ResponsiblesService. Cookie/session concerns live in the auth module.
 */
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CreateResponsibleDto } from "./dto/create-responsible.dto.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";
import { UpdateResponsibleDto } from "./dto/update-responsible.dto.js";
import {
  ResponsiblesService,
  type ResponsibleUserResponse,
} from "./responsibles.service.js";

@Controller("responsibles")
@UseGuards(AuthGuard)
export class ResponsiblesController {
  constructor(
    @Inject(ResponsiblesService)
    private readonly responsiblesService: ResponsiblesService,
  ) {}

  /**
   * AR-06: List all responsible users.
   *
   * Returns every user sorted by creation date (descending).
   * No passwordHash is ever included in the response.
   */
  @Get()
  async findAll(): Promise<ResponsibleUserResponse[]> {
    return this.responsiblesService.findAll();
  }

  /**
   * AR-06: Get a single responsible user by id.
   *
   * Returns 404 when the user does not exist.
   */
  @Get(":id")
  async findById(@Param("id") id: string): Promise<ResponsibleUserResponse> {
    return this.responsiblesService.findById(id);
  }

  /**
   * AR-06: Create a new responsible user.
   *
   * Requires email, displayName, and password (≥ 8 chars). Returns 201
   * on success, 409 on duplicate email, 400 on validation errors.
   */
  @Post()
  async create(
    @Body() dto: CreateResponsibleDto,
  ): Promise<ResponsibleUserResponse> {
    return this.responsiblesService.create(dto);
  }

  /**
   * AR-08: Reset another responsible user's password.
   *
   * Hashes the new password and revokes all refresh sessions for the
   * affected account. Any existing cookies are immediately invalid.
   *
   * This route MUST be declared before the generic `:id` route so NestJS
   * matches the literal `/password` suffix correctly.
   */
  @Patch(":id/password")
  async resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<ResponsibleUserResponse> {
    return this.responsiblesService.resetPassword(id, dto);
  }

  /**
   * AR-06 / AR-07: Update displayName and/or status.
   *
   * Setting status to INACTIVE immediately revokes all refresh sessions
   * for the affected user (AR-07). Returns 404 when the user does not
   * exist.
   */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateResponsibleDto,
  ): Promise<ResponsibleUserResponse> {
    return this.responsiblesService.update(id, dto);
  }
}
