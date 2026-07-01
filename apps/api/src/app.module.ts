/**
 * Root NestJS module.
 *
 * - ConfigModule validates env FIRST (sync, before any module imports).
 * - APP_FILTER registers AllExceptionsFilter via DI so tests can override it.
 * - DbModule, HealthModule, ValidationProofModule are operational modules;
 *   zero static @m199/db imports in apps/api/ (BF-02).
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { ValidationProofModule } from "./common/validation-proof/validation-proof.module.js";
import { validate } from "./config/env.validation.js";
import { DbModule } from "./db/db.module.js";
import { HealthModule } from "./health/health.module.js";
import { AuthModule } from "./auth/auth.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ validate, isGlobal: true }),
    DbModule,
    HealthModule,
    ValidationProofModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
