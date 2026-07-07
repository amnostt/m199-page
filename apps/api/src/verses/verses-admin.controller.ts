/**
 * VersesAdminController — protected admin CRUD for daily verses.
 *
 * POST   /verses/admin       — create a verse (text + reference only).
 * DELETE /verses/admin/:id   — delete a verse.
 * GET    /verses/admin       — list most recent 200 verses (capped).
 *
 * Protected by AuthGuard at controller level: only authenticated
 * ACTIVE responsible users may access these endpoints.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { VersesService } from "./verses.service.js";
import { CreateVerseDto } from "./dto/create-verse.dto.js";

@Controller("verses/admin")
@UseGuards(AuthGuard)
export class VersesAdminController {
  constructor(
    @Inject(VersesService)
    private readonly versesService: VersesService,
  ) {}

  /**
   * Creates a verse with validated DTO.
   *
   * Only text and reference are accepted; date/time fields are stripped
   * by whitelist. The service captures one server instant for both
   * publishedAt and date.
   */
  @Post()
  async create(
    @Body(
      new ValidationPipe({
        expectedType: CreateVerseDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateVerseDto,
  ) {
    return this.versesService.create(dto);
  }

  /**
   * Hard deletes a verse by id.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.versesService.delete(id);
  }

  /**
   * Lists the most recent 200 verses (admin view, capped).
   */
  @Get()
  async findAll() {
    return this.versesService.findAll();
  }
}
