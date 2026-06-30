/**
 * Test setup for @m199/db.
 *
 * Tests must be hermetic — they MUST NOT read root `.env` contents.
 * The DB test mocks `@prisma/client` and `@prisma/adapter-pg` via
 * `vi.mock`, so `getPrisma()` never actually reads `DATABASE_URL`.
 * If a future test needs a value, it sets it explicitly on
 * `process.env` in the test file rather than loading the developer's
 * local `.env`.
 */

// Safe test defaults so any test that accidentally reads process.env
// without a mock still gets a syntactically-valid value. These are
// NOT secrets and never reach a real database in this test suite.
process.env["DATABASE_URL"] ??= "postgresql://test:test@localhost:5432/test";
process.env["NODE_ENV"] ??= "test";
