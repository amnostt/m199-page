/**
 * DB service — boundary between NestJS and @m199/db (BF-04).
 *
 * `onModuleInit()` uses dynamic `await import('@m199/db')` so no static
 * @m199/db import exists in `apps/api/`, satisfying BF-02.
 * The guarded `client` getter ensures consumer code never accesses
 * the Prisma client before module initialization completes.
 */
import { Injectable, type OnModuleInit } from "@nestjs/common";

/**
 * Minimal contract for the PrismaClient returned by @m199/db.
 * Kept local to avoid importing @prisma/client in apps/api (BF-04).
 */
interface PrismaClientLike {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

@Injectable()
export class DbService implements OnModuleInit {
  private _client?: PrismaClientLike;

  async onModuleInit(): Promise<void> {
    const { getPrisma } = await import("@m199/db");
    this._client = await getPrisma();
  }

  get client(): PrismaClientLike {
    if (!this._client) {
      throw new Error("DbService not initialized — call onModuleInit first");
    }
    return this._client;
  }
}
