// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizePublicationContentForSsr } from "./publication-sanitizer.js";

describe("sanitizePublicationContentForSsr", () => {
  it("sanitizes unsafe markup without requiring a browser document", () => {
    const result = sanitizePublicationContentForSsr(
      '<p>Safe</p><script>alert("xss")</script><a href="javascript:bad">Bad</a>',
    );

    expect(result).toContain("<p>Safe</p>");
    expect(result).not.toContain("script");
    expect(result).not.toContain("javascript:");
  });

  it("adds safe external-link attributes to allowed links", () => {
    const result = sanitizePublicationContentForSsr(
      '<a href="https://example.com">Read more</a>',
    );

    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });
});
