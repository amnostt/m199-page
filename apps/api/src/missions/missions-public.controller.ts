import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import { ListMissionsDto } from "./dto/list-missions.dto.js";
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

  @Get("public")
  findManyPublic(
    @Query(
      new ValidationPipe({
        expectedType: ListMissionsDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: ListMissionsDto,
  ) {
    return this.missionsService.findManyPublic(dto);
  }

  @Get("public/:slug")
  findOnePublicBySlug(@Param("slug") slug: string) {
    return this.missionsService.findOnePublicBySlug(slug);
  }

  @Get("archived")
  findArchived() {
    return this.missionsService.findPublicByStatus("ARCHIVED");
  }
}
