# Latest Publications Carousel

## Objective

Replace the landing page's static Publicaciones entry with an SSR-first carousel
of the latest published publications, using the existing Misiones carousel
interaction and composition as the behavioral baseline.

## Problem and why

The landing page currently offers only a static archive link, so recent
published content is not discoverable from the home page. The change must use
the existing public publications API ordering and preserve the incumbent visual
system, accessibility behavior, and independent failure boundaries.

## Scope

- Fetch a bounded, newest-first publication list on the server for `/`.
- Pass publication data into the landing composition without adding React
  hydration or a new dependency.
- Render publication cards with only guaranteed `PublicationListItem` fields,
  using the established public image fallback and `/publicaciones/[slug]`
  destinations.
- Add the matching scroll-snap carousel mechanics, accessible controls, SSR,
  empty-state, failure-isolation, and CSS contract coverage.

## Constraints

- Work directly in the existing worktree; preserve unrelated changes and the
  untracked `.agents/` directory.
- Do not change API/backend capabilities, invent publication fields, or alter
  unrelated behavior.
- Do not commit, push, open a PR, or use SDD.
- Keep technical artifacts in English and existing public UI copy in Spanish.
- Use ordinary behavior-first verification; do not claim RED evidence.

## Stable task checklist

- [x] LP-1 — Wire the bounded SSR publications fetch into the landing route and
      component props with independent failure handling.
- [x] LP-2 — Replace the static entry with latest-publication cards and the
      accessible, progressively enhanced carousel interaction.
- [x] LP-3 — Preserve the visual system with focused carousel CSS and tests for
      rendering, empty/failure states, controls, accessibility, and mechanics.
- [x] LP-4 — Run formatting and all required verification, inspect the complete
  diff, and confirm scope/secrets/generated-file safety.

## Authorized scope

- `apps/web/src/pages/index.astro`
- `apps/web/src/pages/index.test.ts`
- `apps/web/src/components/landing/Landing.astro`
- `apps/web/src/components/landing/Landing.test.ts`
- `apps/web/src/components/landing/LandingPublications.astro`
- `apps/web/src/components/landing/LandingPublications.test.ts`
- `apps/web/src/styles/public.css`
- `apps/web/src/styles/public.css.test.ts`
- `odd/tasks/latest-publications-carousel.md`

Additional web test or server-helper files may be changed only if the
implementation proves them necessary; no backend or unrelated application
areas are authorized.

## Acceptance criteria

- The landing requests only a bounded latest set through the existing public
  publications list helper, whose API response is already newest first.
- Publication fetching can fail without hiding the landing or missions; an
  empty result omits the entire publications section.
- Every rendered card uses only guaranteed list-item data, links to
  `/publicaciones/[slug]`, and keeps the existing “Ver todas” link.
- SSR HTML contains the cards and controls; client JavaScript only progressively
  enhances scroll controls and respects reduced motion.
- Controls are keyboard-accessible, have clear Spanish accessible names, use
  44px targets, and update disabled state at scroll boundaries.
- Carousel CSS uses horizontal overflow, mandatory x scroll-snap, responsive
  card sizing, themed scrollbar mechanics, and reduced-motion behavior without
  introducing a dependency.
- Focused tests cover SSR wiring, rendering, empty/failure isolation, card
  links/image fallback, controls/accessibility, and CSS mechanics.

## Checks

- Focused Vitest command for LandingPublications, Landing, index, and public.css.
- `pnpm --filter @m199/web typecheck`
- `pnpm --filter @m199/web lint`
- `pnpm --filter @m199/web build`
- Impeccable detector over all changed web UI targets.
- `git diff --check`, complete diff and scope/generated-file review.

## Progress

- LP-1: complete — the root route requests page 1 with limit 4 and isolates
  publication failures from the landing and missions requests.
- LP-2: complete — the static entry is now an SSR publication carousel with
  progressive scroll controls and established image fallback behavior.
- LP-3: complete — carousel CSS and focused component, route, landing, and CSS
  tests pass in the required focused command.
- LP-4: complete — focused tests (550/550), typecheck, build, detector, and
  `git diff --check` passed; the requested web lint script is unavailable and
  root lint remains blocked by preserved unrelated `.agents/` files.

## Next step

Implementation and verification are complete. The only follow-ups are the
repository's existing lint/format limitations recorded in the final result.
