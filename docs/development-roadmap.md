# MVP Development Roadmap

Mision 1-99 is currently in the admin UI phase. The core API, database, public content surfaces, and the first operational admin workflows are implemented.

## Current Product State

### Platform

- pnpm monorepo with the React web app, NestJS API, and Prisma database package.
- PostgreSQL migrations, validated environment configuration, health checks, and shared quality commands.
- Automated tests, type checking, linting, formatting, and production builds.

### Authentication and Files

- Cookie-based access and refresh sessions with rotation, logout, CSRF origin checks, active-user enforcement, and immediate token invalidation through `authVersion`.
- Protected responsible-user API with lifecycle operations and password reset.
- Local image and PDF uploads with size, MIME, signature, path-containment, metadata, serving, thumbnail, and deletion controls.

### Public Content

- Editable landing content with featured outing, featured posts, and current verse payloads.
- Published outing list and detail pages with anonymous likes.
- Published post list and detail pages with sanitized rich text, tags, cover images, and downloads.
- Current and historical daily verses.

### Admin UI

- Protected admin shell with login, session refresh, logout, navigation, loading, error, and confirmation states.
- Landing Settings editor for mission, vision, description, featured video, and contact fields.
- Posts list and create/edit workflows, lifecycle actions, cover files, downloads, and featured-post controls.
- Outings list with server-side status filtering, create/edit workflows, draft/publish/archive actions, and main image, croquis, and plan uploads.

## Remaining MVP Work

1. Add admin screens for responsibles, verses, and file management.
2. Add landing controls for the hero image, featured outing, and featured posts.
3. Complete public UI polish, responsive behavior, accessibility, empty/loading states, and page-level SEO.
4. Harden critical validation, authorization, cookie/CORS behavior, upload limits, error handling, and database queries.
5. Define production hosting, storage, PostgreSQL, environment, proxy, backup, and deployment procedures.
6. Run final end-to-end scope and release verification.

## Next Product Slice

Complete the remaining admin management screens, starting with one bounded workflow that already has API support. Keep each slice independently testable and usable before moving to the next admin area.
