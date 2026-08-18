import {
  BadRequestException,
  ConflictException,
  Inject,
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
import type { ListPublicationsDto } from "./dto/list-publications.dto.js";
import type {
  PublicationPublicDetail,
  PublicationsPublicList,
} from "./dto/publication-public.dto.js";

type Client = {
  fileAsset: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      category: string;
    } | null>;
  };
  publication: {
    findMany: (args: unknown) => Promise<PublicationRow[]>;
    findUnique: (args: unknown) => Promise<PublicationRow | null>;
    create: (args: unknown) => Promise<PublicationRow>;
    update: (args: unknown) => Promise<PublicationRow>;
    delete: (args: unknown) => Promise<PublicationRow>;
    count: (args: unknown) => Promise<number>;
  };
  mission: {
    findMany: (args: unknown) => Promise<{ id: string; status: string }[]>;
  };
  publicationMission: {
    deleteMany: (args: unknown) => Promise<void>;
    createMany: (args: unknown) => Promise<void>;
  };
  $transaction: (
    callback: (tx: Client) => Promise<unknown>,
  ) => Promise<unknown>;
};
type PublicationRow = {
  id: string;
  type: PublicationType;
  scope: PublicationScope;
  slug: string;
  publishedAt: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  activityStatus: unknown;
  documentationStatus: unknown;
  missions: { missionId: string }[];
  [key: string]: unknown;
};

@Injectable()
export class PublicationsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}
  private get client(): Client {
    return this.dbService.client as unknown as Client;
  }

  async findMany(status?: PublicationStatus) {
    const rows = await this.client.publication.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { missions: true },
    });
    return rows.map((row) => this.normalize(row));
  }
  async findManyPublic(
    dto: ListPublicationsDto,
  ): Promise<PublicationsPublicList> {
    const skip = (dto.page - 1) * dto.limit;
    const where = {
      status: PublicationStatus.PUBLISHED,
      ...(dto.type ? { type: dto.type } : {}),
    };
    const rows = await this.client.publication.findMany({
      where,
      skip,
      take: dto.limit + 1,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: {
        slug: true,
        title: true,
        excerpt: true,
        type: true,
        publishedAt: true,
        featuredImageId: true,
      },
    });
    const total = await this.client.publication.count({ where });
    return {
      items: rows.slice(0, dto.limit).map((row) => ({
        slug: String(row.slug),
        title: String(row.title),
        excerpt: String(row.excerpt),
        type: String(row.type),
        publishedAt: new Date(row.publishedAt as Date).toISOString(),
        featuredImageUrl: row.featuredImageId
          ? `/files/${String(row.featuredImageId)}`
          : null,
      })),
      page: dto.page,
      limit: dto.limit,
      total,
      hasMore: skip + dto.limit < total,
    };
  }
  async findOnePublicBySlug(slug: string): Promise<PublicationPublicDetail> {
    const row = await this.client.publication.findUnique({
      where: { slug, status: PublicationStatus.PUBLISHED },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        type: true,
        publishedAt: true,
        featuredImageId: true,
        startDate: true,
        endDate: true,
        activityStatus: true,
        documentationStatus: true,
        missions: {
          orderBy: [
            { mission: { createdAt: "desc" } },
            { mission: { id: "desc" } },
          ],
          select: {
            mission: { select: { slug: true, title: true, status: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException(`Publication "${slug}" not found`);
    const detail: PublicationPublicDetail = {
      slug: String(row.slug),
      title: String(row.title),
      excerpt: String(row.excerpt),
      content: sanitizePublicationContent(String(row.content)),
      type: String(row.type),
      publishedAt: new Date(row.publishedAt as Date).toISOString(),
      featuredImageUrl: row.featuredImageId
        ? `/files/${String(row.featuredImageId)}`
        : null,
      missions: (
        (
          row as unknown as {
            missions?: {
              mission: {
                slug: string;
                title: string;
                status: "ACTIVE" | "ARCHIVED";
              };
            }[];
          }
        ).missions ?? []
      ).map(({ mission }) => ({
        slug: String(mission.slug),
        title: String(mission.title),
        status: mission.status,
      })),
    };
    if (row.type !== PublicationType.POST) {
      detail.startDate = new Date(row.startDate as Date).toISOString();
      detail.endDate = row.endDate
        ? new Date(row.endDate as Date).toISOString()
        : null;
      detail.activityStatus = String(row.activityStatus);
      detail.documentationStatus = String(row.documentationStatus);
    }
    return detail;
  }
  async findOne(id: string) {
    const row = await this.client.publication.findUnique({
      where: { id },
      include: { missions: true },
    });
    if (!row) throw new NotFoundException(`Publication "${id}" not found`);
    return this.normalize(row);
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
            // The trigger requires a link before MISSION can be stored.
            scope: PublicationScope.GENERAL,
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
      dto.scope !== undefined || dto.missionIds !== undefined
        ? await this.validateMissions(
            dto.scope ?? existing.scope,
            dto.missionIds ?? existing.missionIds,
          )
        : undefined;
    try {
      return await this.client.$transaction(async (tx: Client) => {
        if (missions) await this.syncLinks(tx, id, missions);
        const changingToPost =
          type === PublicationType.POST && existing.type !== type;
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
            scope: dto.scope,
            startDate: changingToPost ? null : dto.startDate,
            endDate: changingToPost ? null : dto.endDate,
            activityStatus: changingToPost ? null : dto.activityStatus,
            documentationStatus: changingToPost
              ? null
              : dto.documentationStatus,
          },
        });
        return this.findIn(tx, row.id);
      });
    } catch (error) {
      this.handleError(error, dto.slug ?? existing.slug);
    }
  }
  async updateStatus(id: string, status: PublicationStatus) {
    const row = await this.findOne(id);
    const updated = await this.client.publication.update({
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
    return this.normalize(updated);
  }
  async updateScope(id: string, scope: PublicationScope, missionIds: string[]) {
    await this.findOne(id);
    const missions = await this.validateMissions(scope, missionIds);
    return this.client.$transaction(async (tx: Client) => {
      await this.syncLinks(tx, id, missions);
      await tx.publication.update({ where: { id }, data: { scope } });
      return this.findIn(tx, id);
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    await this.client.publication.delete({ where: { id } });
  }
  private async findIn(client: Client, id: string) {
    const row = await client.publication.findUnique({
      where: { id },
      include: { missions: true },
    });
    return row && this.normalize(row);
  }
  private normalize(row: PublicationRow) {
    const { missions, ...publication } = row;
    return {
      ...publication,
      missionIds: missions.map((mission) => mission.missionId).sort(),
    };
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
