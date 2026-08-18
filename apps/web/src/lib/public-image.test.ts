import { describe, expect, it } from "vitest";
import {
  PUBLIC_IMAGE_FALLBACK,
  PUBLIC_IMAGE_FALLBACK_HANDLER,
  resolvePublicImageUrl,
} from "./public-image.js";

describe("public image fallback", () => {
  it.each([undefined, null, "", "  "])(
    "resolves a missing image URL to the shared placeholder for %j",
    (imageUrl) => {
      expect(resolvePublicImageUrl(imageUrl)).toBe(PUBLIC_IMAGE_FALLBACK);
    },
  );

  it("preserves a real image URL", () => {
    expect(resolvePublicImageUrl("/files/mission-hero")).toBe(
      "/files/mission-hero",
    );
  });

  it("clears the error handler before switching to the placeholder", () => {
    expect(PUBLIC_IMAGE_FALLBACK_HANDLER).toBe(
      `this.onerror=null;this.src='${PUBLIC_IMAGE_FALLBACK}'`,
    );
  });
});
