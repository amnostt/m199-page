import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CreateMissionDto } from "./dto/create-mission.dto.js";
import { UpdateMissionDto } from "./dto/update-mission.dto.js";
import { UpdateMissionStatusDto } from "./dto/update-mission-status.dto.js";
import { MissionsService } from "./missions.service.js";

@Controller("missions/admin")
@UseGuards(AuthGuard)
export class MissionsAdminController {
  constructor(
    @Inject(MissionsService) private readonly missionsService: MissionsService,
  ) {}

  @Get("active")
  findActive() {
    return this.missionsService.findByStatus("ACTIVE");
  }

  @Get("archived")
  findArchived() {
    return this.missionsService.findByStatus("ARCHIVED");
  }

  @Post()
  create(
    @Body(
      new ValidationPipe({
        expectedType: CreateMissionDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateMissionDto,
  ) {
    return this.missionsService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateMissionDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateMissionDto,
  ) {
    return this.missionsService.update(id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateMissionStatusDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateMissionStatusDto,
  ) {
    return this.missionsService.updateStatus(id, dto.status);
  }
}
