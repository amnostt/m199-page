import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DbService } from "../db/db.service.js";
import { assertFileCategory } from "../file-module/assert-file-category.js";
import type { CreateMissionDto } from "./dto/create-mission.dto.js";
import type { UpdateMissionDto } from "./dto/update-mission.dto.js";

export interface MissionRow {
  id: string;
  slug: string;
  title: string;
  heroImageId: string;
  heroPhrase: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}
export interface MissionPublicSummary {
  id: string;
  slug: string;
  title: string;
  heroImageUrl: string;
  heroPhrase: string;
  status: "ACTIVE" | "ARCHIVED";
}
interface MissionsClient {
  mission: {
    findMany(args: {
      where: { status: MissionRow["status"] };
      orderBy: Array<Record<string, string>>;
    }): Promise<MissionRow[]>;
    findUnique(args: {
      where: { id?: string; slug?: string };
    }): Promise<MissionRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<MissionRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MissionRow>;
  };
  fileAsset: {
    findUnique(args: {
      where: { id: string };
    }): Promise<{ id: string; category: string } | null>;
  };
}

@Injectable()
export class MissionsService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}
  private get client(): MissionsClient {
    return this.dbService.client as unknown as MissionsClient;
  }
  private orderBy: Array<Record<string, string>> = [
    { createdAt: "desc" },
    { id: "desc" },
  ];

  async findByStatus(status: MissionRow["status"]): Promise<MissionRow[]> {
    return this.client.mission.findMany({
      where: { status },
      orderBy: this.orderBy,
    });
  }
  async create(dto: CreateMissionDto): Promise<MissionRow> {
    await assertFileCategory(this.client, dto.heroImageId, "MISSION_HERO");
    try {
      return await this.client.mission.create({
        data: { ...dto, status: "ACTIVE" },
      });
    } catch (error) {
      this.handleUnique(error, dto.slug);
      throw error;
    }
  }
  async update(id: string, dto: UpdateMissionDto): Promise<MissionRow> {
    const existing = await this.client.mission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Mission "${id}" not found`);
    const data = { ...existing, ...dto };
    await assertFileCategory(this.client, data.heroImageId, "MISSION_HERO");
    try {
      return await this.client.mission.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug,
          heroImageId: data.heroImageId,
          heroPhrase: data.heroPhrase,
        },
      });
    } catch (error) {
      this.handleUnique(error, data.slug);
      throw error;
    }
  }
  async updateStatus(
    id: string,
    status: MissionRow["status"],
  ): Promise<MissionRow> {
    const existing = await this.client.mission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Mission "${id}" not found`);
    if (existing.status === status)
      throw new ConflictException("Cannot change mission status");
    return this.client.mission.update({ where: { id }, data: { status } });
  }
  toPublicSummary(row: MissionRow): MissionPublicSummary {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      heroImageUrl: `/files/${row.heroImageId}`,
      heroPhrase: row.heroPhrase,
      status: row.status,
    };
  }
  async findPublicByStatus(
    status: MissionRow["status"],
  ): Promise<MissionPublicSummary[]> {
    return (await this.findByStatus(status)).map((row) =>
      this.toPublicSummary(row),
    );
  }
  private handleUnique(error: unknown, slug: string): void {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new ConflictException(`Slug "${slug}" already exists`);
  }
}
