/**
 * OutingsAdminController — protected admin CRUD and feature management.
 *
 * GET   /outings/admin              — list outings (optional status/pagination).
 * POST  /outings/admin              — create an outing.
 * PATCH /outings/admin/:id          — update an outing.
 * POST  /outings/admin/:id/archive  — archive an outing.
 * POST  /outings/admin/:id/feature  — feature a PUBLISHED outing.
 *
 * Protected by AuthGuard at controller level: only authenticated
 * ACTIVE responsible users may access these endpoints.
 * Unauthenticated requests receive 401 (OUT-01).
 */
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { OutingsService } from "./outings.service.js";
import { CreateOutingDto } from "./dto/create-outing.dto.js";
import { UpdateOutingDto } from "./dto/update-outing.dto.js";
import { OutingListQueryDto } from "./dto/outing-list-query.dto.js";

@Controller("outings/admin")
@UseGuards(AuthGuard)
export class OutingsAdminController {
  constructor(
    @Inject(OutingsService)
    private readonly outingsService: OutingsService,
  ) {}

  /**
   * Lists outings with optional status filter and pagination (OUT-01).
   */
  @Get()
  async findAll(@Query() query: OutingListQueryDto) {
    return this.outingsService.findAll(query);
  }

  /**
   * Creates an outing with validated DTO (OUT-01).
   */
  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateOutingDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateOutingDto,
  ) {
    return this.outingsService.create(dto);
  }

  /**
   * Partially updates an outing by id (OUT-01).
   */
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateOutingDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateOutingDto,
  ) {
    return this.outingsService.update(id, dto);
  }

  /**
   * Archives an outing by setting status to ARCHIVED (OUT-01).
   */
  @Post(":id/archive")
  async archive(@Param("id") id: string) {
    return this.outingsService.archive(id);
  }

  /**
   * Features a PUBLISHED outing by delegating to LandingService (OUT-05).
   *
   * The service validates that the outing is PUBLISHED before updating
   * the landing singleton featuredOutingId.
   */
  @Post(":id/feature")
  async feature(@Param("id") id: string) {
    await this.outingsService.featureOuting(id);
    return { featuredOutingId: id };
  }
}
