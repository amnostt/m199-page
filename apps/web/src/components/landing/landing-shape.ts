/**
 * landing-shape.ts — public TypeScript shape of the validated landing
 * payload, decoupled from the Astro component file.
 *
 * Why a separate file:
 *  - The .astro component is a runtime artifact; importing its
 *    exported interfaces through `import { type LandingPayloadShape }
 *    from "./Landing.astro"` works at runtime but is brittle for
 *    typecheck because TypeScript needs an explicit module
 *    declaration for `.astro` files.
 *  - Keeping the shapes in a plain `.ts` file makes the
 *    import-and-typecheck path trivial. The Astro component
 *    re-exports the same types so component consumers can still
 *    use `import type` against the component.
 *
 * This shape mirrors the validated `LandingPublicPayload` produced
 * by `apps/web/src/lib/server/landing.ts` and is asserted by
 * `apps/web/src/components/landing/Landing.test.ts`.
 */

export interface LandingFailure {
  reason: string;
}

export interface LandingOuting {
  id: string;
  slug: string;
  title: string;
  location: string;
  mainImageUrl: string | null;
}

export interface LandingPost {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
}

export interface LandingVerse {
  text: string;
  reference: string;
  date: string;
}

export interface LandingPayloadShape {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  featuredOuting: LandingOuting | null;
  featuredPosts: LandingPost[];
  currentVerse: LandingVerse | null;
}
