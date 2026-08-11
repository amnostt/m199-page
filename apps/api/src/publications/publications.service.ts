import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import { assertFileCategory } from "../file-module/assert-file-category.js";
import { sanitizePublicationContent } from "./sanitizer.js";
import {
  CreatePublicationDto,
  PublicationScope,
  PublicationStatus,
  PublicationType,
  UpdatePublicationDto,
} from "./dto/publication.dto.js";

type Client = any;

@Injectable()
export class PublicationsService {
  constructor(private readonly dbService: DbService) {}
  private get client(): Client {
    return this.dbService.client as unknown as Client;
  }

  async findMany(status?: PublicationStatus) {
    return this.client.publication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { missions: true },
    });
  }
  async findOne(id: string) {
    const row = await this.client.publication.findUnique({
      where: { id },
      include: { missions: true },
    });
    if (!row) throw new NotFoundException(`Publication "${id}" not found`);
    return row;
  }
  async create(dto: CreatePublicationDto) {
    this.validateShape(
      dto.type,
      dto.startDate,
      dto.endDate,
      dto.activityStatus,
      dto.documentationStatus,
    );
    await assertFileCategory(
      this.client,
      dto.featuredImageId,
      "PUBLICATION_FEATURED_IMAGE",
    );
    const missions = await this.validateMissions(
      dto.scope ?? PublicationScope.GENERAL,
      dto.missionIds ?? [],
    );
    try {
      return await this.client.$transaction(async (tx: Client) => {
        const row = await tx.publication.create({
          data: {
            slug: dto.slug,
            title: dto.title,
            excerpt: dto.excerpt,
            content: sanitizePublicationContent(dto.content),
            featuredImageId: dto.featuredImageId,
            type: dto.type,
            status: dto.status ?? PublicationStatus.DRAFT,
            publishedAt:
              dto.status === PublicationStatus.PUBLISHED ? new Date() : null,
            scope: dto.scope ?? PublicationScope.GENERAL,
            startDate: dto.startDate ?? null,
            endDate: dto.endDate ?? null,
            activityStatus: dto.activityStatus ?? null,
            documentationStatus: dto.documentationStatus ?? null,
          },
        });
        await this.syncLinks(tx, row.id, missions);
        return this.findIn(tx, row.id);
      });
    } catch (error) {
      this.handleError(error, dto.slug);
    }
  }
  async update(id: string, dto: UpdatePublicationDto) {
    const existing = await this.findOne(id);
    const type = dto.type ?? existing.type;
    if (dto.type && dto.type !== existing.type && !dto.confirmTypeChange)
      throw new BadRequestException(
        "confirmTypeChange is required when changing publication type",
      );
    this.validateShape(
      type,
      dto.startDate === undefined ? existing.startDate : dto.startDate,
      dto.endDate === undefined ? existing.endDate : dto.endDate,
      dto.activityStatus === undefined
        ? existing.activityStatus
        : dto.activityStatus,
      dto.documentationStatus === undefined
        ? existing.documentationStatus
        : dto.documentationStatus,
    );
    if (dto.featuredImageId)
      await assertFileCategory(
        this.client,
        dto.featuredImageId,
        "PUBLICATION_FEATURED_IMAGE",
      );
    const missions =
      dto.scope || dto.missionIds
        ? await this.validateMissions(
            dto.scope ?? existing.scope,
            dto.missionIds ?? existing.missions.map((m: any) => m.missionId),
          )
        : undefined;
    try {
      return await this.client.$transaction(async (tx: Client) => {
        const row = await tx.publication.update({
          where: { id },
          data: {
            slug: dto.slug,
            title: dto.title,
            excerpt: dto.excerpt,
            content:
              dto.content === undefined
                ? undefined
                : sanitizePublicationContent(dto.content),
            featuredImageId: dto.featuredImageId,
            type: dto.type,
            scope: undefined,
            startDate: dto.startDate,
            endDate: dto.endDate,
            activityStatus: dto.activityStatus,
            documentationStatus: dto.documentationStatus,
          },
        });
        if (missions) await this.syncLinks(tx, id, missions);
        return this.findIn(tx, row.id);
      });
    } catch (error) {
      this.handleError(error, dto.slug ?? existing.slug);
    }
  }
  async updateStatus(id: string, status: PublicationStatus) {
    const row = await this.findOne(id);
    return this.client.publication.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === PublicationStatus.PUBLISHED
            ? (row.publishedAt ?? new Date())
            : null,
      },
      include: { missions: true },
    });
  }
  async updateScope(id: string, scope: PublicationScope, missionIds: string[]) {
    await this.findOne(id);
    const missions = await this.validateMissions(scope, missionIds);
    return this.client.$transaction(async (tx: Client) => {
      await this.syncLinks(tx, id, missions);
      return this.findIn(tx, id);
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    await this.client.publication.delete({ where: { id } });
  }
  private async findIn(client: Client, id: string) {
    return client.publication.findUnique({
      where: { id },
      include: { missions: true },
    });
  }
  private async validateMissions(scope: PublicationScope, ids: string[]) {
    if (scope === PublicationScope.GENERAL && ids.length)
      throw new BadRequestException(
        "GENERAL publications cannot have missions",
      );
    if (scope === PublicationScope.MISSION && !ids.length)
      throw new BadRequestException(
        "MISSION publications require at least one mission",
      );
    const unique = [...new Set(ids)];
    if (!unique.length) return unique;
    const rows = await this.client.mission.findMany({
      where: { id: { in: unique }, status: "ACTIVE" },
    });
    if (rows.length !== unique.length)
      throw new BadRequestException("All linked missions must be ACTIVE");
    return unique;
  }
  private async syncLinks(tx: Client, id: string, missionIds: string[]) {
    await tx.publicationMission.deleteMany({
      where: {
        publicationId: id,
        ...(missionIds.length ? { missionId: { notIn: missionIds } } : {}),
      },
    });
    if (missionIds.length)
      await tx.publicationMission.createMany({
        data: missionIds.map((missionId) => ({ publicationId: id, missionId })),
        skipDuplicates: true,
      });
  }
  private validateShape(
    type: PublicationType,
    start: Date | null | undefined,
    end: Date | null | undefined,
    activity: unknown,
    documentation: unknown,
  ) {
    if (
      type === PublicationType.POST &&
      (start || end || activity || documentation)
    )
      throw new BadRequestException(
        "POST publications cannot have activity fields",
      );
    if (
      type !== PublicationType.POST &&
      (!start || !activity || !documentation)
    )
      throw new BadRequestException(
        "Activity publications require startDate, activityStatus, and documentationStatus",
      );
    if (start && end && end < start)
      throw new BadRequestException("endDate must be on or after startDate");
  }
  private handleError(error: unknown, slug: string): never {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new ConflictException(`Slug "${slug}" already exists`);
    throw error;
  }
}
