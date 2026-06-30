# Backend API Foundation Specification

## Purpose

NestJS API bootstrap, config validation, error conventions, DB boundary, health endpoint — before product or auth modules.

## Requirements

| ID | Requirement | Scenarios |
|----|------------|-----------|
| BF-01 | API MUST boot via `NestFactory`+`AppModule`, replacing placeholder. Config validation MUST precede any `@m199/db` import. | **Valid config**: server starts on configured port. **Invalid config**: fails with actionable error before DB touch. |
| BF-02 | Env vars MUST be validated before any import resolves `@m199/db`. | **Module-wide**: validated config available without re-reading env. **Missing DB_URL**: throws before `@m199/db` loads. |
| BF-03 | Global validation pipe and error envelope MUST be defined. Stack traces MUST NOT leak. | **Invalid input**: responds with `{message, statusCode}`. **Unhandled exception**: no stack trace in response. |
| BF-04 | DB access MUST go through API provider/service wrapping `@m199/db`, without Prisma ownership in `apps/api`. | **Injection**: controllers inject DB service, not Prisma Client. **Testability**: boundary is mockable, no live DB required. |
| BF-05 | `GET /health` MUST report process/config readiness only. MUST NOT depend on database. | **Healthy**: 200 with alive indicator. **Isolation**: succeeds without DB connectivity. |
| BF-06 | Tests MUST cover bootstrap wiring, health controller/service, config failures, and DB boundaries. | **Compile**: `AppModule` compiles in test. **Config**: throws on invalid env before downstream. **Mock**: test double satisfies boundary contract. |
