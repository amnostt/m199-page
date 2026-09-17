// @vitest-environment node
//
// WU3 / Slice 1 — focused covering tests for the spec scenarios that
// require runtime evidence the legacy `featuredOuting` and
// `featuredPosts` keys are no longer part of the public landing
// contract. These tests close the spec-compliance gap for the "Payload
// omits featured keys" scenario with a single colocated unit test
// rather than only the static search evidence available previously.

import { describe, it, expect } from "vitest";
import { validateLandingPublicPayload } from "./landing.js";

const BASE_VALID_PAYLOAD = {
  heroTitle: "Misión 1-99",
  heroSubtitle: null,
  heroImageUrl: null,
  missionsTitle: null,
  missionsDescription: null,
  publicationsTitle: null,
  publicationsDescription: null,
  aboutTitle: null,
  mission: null,
  vision: null,
  description: null,
  featuredVideoUrl: null,
  contactTitle: null,
  contactDescription: null,
  contactEmail: null,
  contactPhone: null,
  visualBreakImageUrl: null,
  currentVerse: null,
};

describe("Landing public payload — featured payload removal (WU3)", () => {
  it("does not expose a featuredOuting key on the validated payload", () => {
    const payload = validateLandingPublicPayload({
      ...BASE_VALID_PAYLOAD,
      featuredOuting: {
        id: "out-1",
        slug: "out-1",
        title: "Featured Outing",
        location: "Buenos Aires",
        mainImageUrl: null,
      },
    });

    expect(
      Object.prototype.hasOwnProperty.call(payload, "featuredOuting"),
    ).toBe(false);
  });

  it("does not expose a featuredPosts key on the validated payload", () => {
    const payload = validateLandingPublicPayload({
      ...BASE_VALID_PAYLOAD,
      featuredPosts: [
        {
          id: "p-1",
          slug: "p-1",
          title: "Featured Post",
          coverImageUrl: null,
        },
      ],
    });

    expect(Object.prototype.hasOwnProperty.call(payload, "featuredPosts")).toBe(
      false,
    );
  });

  it("ignores legacy featuredOuting and featuredPosts even when they are present and well-formed", () => {
    // The validator must not throw when a server-side response still
    // includes the legacy keys (e.g. an in-flight deploy where the
    // older API process is serving requests) — the spec requires
    // *removal from the contract*, not an error path.
    expect(() =>
      validateLandingPublicPayload({
        ...BASE_VALID_PAYLOAD,
        featuredOuting: {
          id: "out-1",
          slug: "out-1",
          title: "Featured Outing",
          location: "Buenos Aires",
          mainImageUrl: null,
        },
        featuredPosts: [
          {
            id: "p-1",
            slug: "p-1",
            title: "Featured Post",
            coverImageUrl: null,
          },
        ],
      }),
    ).not.toThrow();
  });
});
