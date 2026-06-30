/**
 * DB module — global NestJS module providing DbService.
 *
 * Exports DbService so any module can inject it without importing
 * this module directly. Zero static @m199/db imports (BF-02).
 */
import { Global, Module } from "@nestjs/common";
import { DbService } from "./db.service.js";

@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
