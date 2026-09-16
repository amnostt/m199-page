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
  CIVIL_DATE_REGEX,
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
  publicationImage: {
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
  activityDate: Date | null;
  images: { fileAssetId: string; position: number }[];
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
      include: {
        missions: true,
        images: { orderBy: { position: "asc" } },
      },
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
        activityDate: true,
        images: {
          where: { position: 0 },
          select: { fileAssetId: true },
        },
      },
    });
    const total = await this.client.publication.count({ where });
    return {
      items: rows.slice(0, dto.limit).map((row) => {
        const item = {
          slug: String(row.slug),
          title: String(row.title),
          excerpt: String(row.excerpt),
          type: String(row.type),
          publishedAt: new Date(row.publishedAt as Date).toISOString(),
          featuredImageUrl: row.images[0]?.fileAssetId
            ? `/files/${String(row.images[0].fileAssetId)}`
            : null,
        };
        if (row.type !== PublicationType.POST)
          return {
            ...item,
            activityDate: this.formatDateOnly(row.activityDate) ?? undefined,
          };
        return item;
      }),
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
        images: {
          orderBy: { position: "asc" },
          select: { fileAssetId: true, position: true },
        },
        activityDate: true,
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
      featuredImageUrl: row.images[0]?.fileAssetId
        ? `/files/${String(row.images[0].fileAssetId)}`
        : null,
      imageUrls: row.images.map(({ fileAssetId }) => `/files/${fileAssetId}`),
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
    if (row.type !== PublicationType.POST)
      detail.activityDate = this.formatDateOnly(row.activityDate) ?? undefined;
    return detail;
  }
  async findOne(id: string) {
    const row = await this.client.publication.findUnique({
      where: { id },
      include: {
        missions: true,
        images: { orderBy: { position: "asc" } },
      },
    });
    if (!row) throw new NotFoundException(`Publication "${id}" not found`);
    return this.normalize(row);
  }
  async create(dto: CreatePublicationDto) {
    this.validateShape(dto.type, dto.activityDate);
    try {
      return await this.client.$transaction(async (tx: Client) => {
        await this.validateImages(tx, dto.imageIds);
        const missions = await this.validateMissions(
          tx,
          dto.scope ?? PublicationScope.GENERAL,
          dto.missionIds ?? [],
        );
        const row = await tx.publication.create({
          data: {
            slug: dto.slug,
            title: dto.title,
            excerpt: dto.excerpt,
            content: sanitizePublicationContent(dto.content),
            type: dto.type,
            status: dto.status ?? PublicationStatus.DRAFT,
            publishedAt:
              dto.status === PublicationStatus.PUBLISHED ? new Date() : null,
            // The trigger requires a link before MISSION can be stored.
            scope: PublicationScope.GENERAL,
            activityDate: this.toDateOnly(dto.activityDate),
          },
        });
        await this.syncImages(tx, row.id, dto.imageIds);
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
      dto.activityDate === undefined ? existing.activityDate : dto.activityDate,
    );
    const imageIds = dto.imageIds ?? existing.imageIds;
    try {
      return await this.client.$transaction(async (tx: Client) => {
        await this.validateImages(tx, imageIds);
        const missions =
          dto.scope !== undefined || dto.missionIds !== undefined
            ? await this.validateMissions(
                tx,
                dto.scope ?? existing.scope,
                dto.missionIds ?? existing.missionIds,
              )
            : undefined;
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
            type: dto.type,
            scope: dto.scope,
            activityDate: changingToPost
              ? null
              : dto.activityDate === undefined
                ? undefined
                : this.toDateOnly(dto.activityDate),
          },
        });
        if (dto.imageIds) await this.syncImages(tx, id, dto.imageIds);
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
      include: {
        missions: true,
        images: { orderBy: { position: "asc" } },
      },
    });
    return this.normalize(updated);
  }
  async updateScope(id: string, scope: PublicationScope, missionIds: string[]) {
    await this.findOne(id);
    return this.client.$transaction(async (tx: Client) => {
      const missions = await this.validateMissions(tx, scope, missionIds);
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
      include: {
        missions: true,
        images: { orderBy: { position: "asc" } },
      },
    });
    return row && this.normalize(row);
  }
  private normalize(row: PublicationRow) {
    const { missions, images, ...publication } = row;
    return {
      ...publication,
      activityDate: this.formatDateOnly(publication.activityDate),
      imageIds: [...images]
        .sort((a, b) => a.position - b.position)
        .map(({ fileAssetId }) => fileAssetId),
      missionIds: missions.map((mission) => mission.missionId).sort(),
    };
  }
  private async validateMissions(
    client: Client,
    scope: PublicationScope,
    ids: string[],
  ) {
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
    const rows = await client.mission.findMany({
      where: { id: { in: unique }, status: "ACTIVE" },
    });
    if (rows.length !== unique.length)
      throw new BadRequestException("All linked missions must be ACTIVE");
    return unique;
  }
  private async validateImages(client: Client, ids: string[]) {
    if (ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length)
      throw new BadRequestException(
        "Publications require one to five unique images",
      );
    await Promise.all(
      ids.map((id) =>
        assertFileCategory(client, id, "PUBLICATION_FEATURED_IMAGE"),
      ),
    );
  }
  private async syncImages(client: Client, id: string, imageIds: string[]) {
    await client.publicationImage.deleteMany({
      where: { publicationId: id },
    });
    await client.publicationImage.createMany({
      data: imageIds.map((fileAssetId, position) => ({
        publicationId: id,
        fileAssetId,
        position,
      })),
    });
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
    activityDate: string | Date | null | undefined,
  ) {
    if (type === PublicationType.POST && activityDate)
      throw new BadRequestException(
        "POST publications cannot have activity fields",
      );
    if (type !== PublicationType.POST && !activityDate)
      throw new BadRequestException(
        "Activity publications require activityDate",
      );
    if (
      activityDate &&
      (activityDate instanceof Date
        ? Number.isNaN(activityDate.getTime())
        : !this.isValidCivilDate(activityDate))
    )
      throw new BadRequestException("activityDate must use YYYY-MM-DD");
  }
  private toDateOnly(value: string | Date | null | undefined) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    return new Date(`${value}T00:00:00.000Z`);
  }
  private isValidCivilDate(value: string) {
    if (!CIVIL_DATE_REGEX.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return date.toISOString().slice(0, 10) === value;
  }
  private formatDateOnly(value: Date | string | null | undefined) {
    if (!value) return null;
    if (typeof value === "string") return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
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
