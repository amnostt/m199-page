import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import {
  CreatePublicationDto,
  PublicationQueryDto,
  UpdatePublicationDto,
  PublicationScopeDto,
  UpdatePublicationStatusDto,
} from "./dto/publication.dto.js";
import { PublicationsService } from "./publications.service.js";

const validation = (expectedType: new () => object) =>
  new ValidationPipe({ expectedType, transform: true, whitelist: true });

@Controller("publications/admin")
@UseGuards(AuthGuard)
export class PublicationsAdminController {
  constructor(
    @Inject(PublicationsService)
    private readonly publicationsService: PublicationsService,
  ) {}

  @Get()
  findMany(@Query(validation(PublicationQueryDto)) dto: PublicationQueryDto) {
    return this.publicationsService.findMany(dto.status);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.publicationsService.findOne(id);
  }

  @Post()
  create(@Body(validation(CreatePublicationDto)) dto: CreatePublicationDto) {
    return this.publicationsService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(validation(UpdatePublicationDto)) dto: UpdatePublicationDto,
  ) {
    return this.publicationsService.update(id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body(validation(UpdatePublicationStatusDto))
    dto: UpdatePublicationStatusDto,
  ) {
    return this.publicationsService.updateStatus(id, dto.status);
  }

  @Patch(":id/scope")
  updateScope(
    @Param("id") id: string,
    @Body(validation(PublicationScopeDto)) dto: PublicationScopeDto,
  ) {
    return this.publicationsService.updateScope(id, dto.scope, dto.missionIds);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string): Promise<void> {
    await this.publicationsService.remove(id);
  }
}
