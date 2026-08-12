import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import { ListPublicationsDto } from "./dto/list-publications.dto.js";
import { PublicationsService } from "./publications.service.js";

@Controller("publications/public")
export class PublicationsPublicController {
  constructor(
    @Inject(PublicationsService)
    private readonly publicationsService: PublicationsService,
  ) {}

  @Get()
  findMany(
    @Query(
      new ValidationPipe({
        expectedType: ListPublicationsDto,
        transform: true,
        whitelist: true,
      }),
    )
    dto: ListPublicationsDto,
  ) {
    return this.publicationsService.findManyPublic(dto);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.publicationsService.findOnePublicBySlug(slug);
  }
}
