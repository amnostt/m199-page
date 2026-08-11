import { Controller, Get, Inject } from "@nestjs/common";
import { MissionsService } from "./missions.service.js";

@Controller("missions")
export class MissionsPublicController {
  constructor(
    @Inject(MissionsService) private readonly missionsService: MissionsService,
  ) {}

  @Get("active")
  findActive() {
    return this.missionsService.findPublicByStatus("ACTIVE");
  }

  @Get("archived")
  findArchived() {
    return this.missionsService.findPublicByStatus("ARCHIVED");
  }
}
