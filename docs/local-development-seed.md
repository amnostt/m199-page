# Local development database seed

The canonical local seed is run by `pnpm db:seed`. It creates a deterministic
development graph after migrations, including:

- An active administrator: `admin@example.com`
- A published post, a draft post, and one featured post relation
- One published featured outing connected to the landing singleton
- One latest published verse

The local administrator password is `qawsedrf`. These credentials are for
local development only and must never be used against a shared or production
database.

## Safe reset

`pnpm db:reset` refuses to run unless `DATABASE_URL` targets the expected local
Compose PostgreSQL database (`localhost` or `127.0.0.1`, port `5432`, database
`m199`, and the Compose credentials). When accepted, it performs these steps:

1. Destroys the local Compose volume.
2. Starts PostgreSQL.
3. Waits for `pg_isready`.
4. Deploys migrations.
5. Explicitly runs `prisma db seed`.

The seed is idempotent and preserves non-null customized landing text fields.
It intentionally does not create sessions, likes, revisions, downloads, or
orphan file assets.
