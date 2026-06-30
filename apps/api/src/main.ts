/**
 * NestJS API bootstrap entry point.
 *
 * Config validation runs synchronously via ConfigModule.forRoot before any
 * downstream module resolves `@m199/db`, satisfying BF-01 and BF-02.
 */
import "reflect-metadata";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

/**
 * Applies the global ValidationPipe used by the API.
 *
 * Exported as the single source of truth for global pipe behavior so
 * the bootstrap wiring test can call the same configuration on a
 * Test-built application. If this function is removed or its options
 * change, the wiring test will fail.
 */
export function applyGlobalPipes(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
}

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  applyGlobalPipes(app);

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 3000);

  await app.listen(port);
  console.log(`API listening on port ${String(port)}`);
}

// vitest sets process.env.VITEST; skip auto-execution in tests so
// bootstrap() can be called and awaited explicitly during assertions.
if (!process.env.VITEST) {
  void bootstrap();
}
