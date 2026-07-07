/**
 * Shared sanitizer tests — post-apply review fix.
 *
 * Verifies:
 * - Protocol-relative URLs are stripped (Blocker 2)
 * - Safe link attributes applied to all anchors (Blocker 1)
 * - Standard DOMPurify sanitization behavior
 */
import { describe, it, expect } from "vitest";
import { sanitizeAndMakeSafe } from "./sanitize.js";

describe("sanitizeAndMakeSafe", () => {
  // -----------------------------------------------------------------------
  // Safe URL schemes pass through
  // -----------------------------------------------------------------------

  it("preserves https:// href", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="https://safe.com">Link</a>',
    );
    expect(result).toContain('href="https://safe.com"');
  });

  it("preserves http:// href", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="http://oldsite.com">Link</a>',
    );
    expect(result).toContain('href="http://oldsite.com"');
  });

  it("preserves mailto: href", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="mailto:test@example.com">Email</a>',
    );
    expect(result).toContain('href="mailto:test@example.com"');
  });

  // -----------------------------------------------------------------------
  // Protocol-relative URLs are stripped (Blocker 2) — TDD RED
  // -----------------------------------------------------------------------

  it("strips protocol-relative URLs (//evil.com)", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="//evil.com/phishing">Click me</a>',
    );
    // href should be removed, anchor text preserved
    expect(result).not.toContain("//evil.com");
    expect(result).toContain("Click me");
  });

  // -----------------------------------------------------------------------
  // javascript: and data: schemes are stripped
  // -----------------------------------------------------------------------

  it("strips javascript: href", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="javascript:alert(1)">Click</a>',
    );
    expect(result).not.toContain("javascript:");
    expect(result).toContain("Click");
  });

  it("strips data: URI href", () => {
    const result = sanitizeAndMakeSafe(
      '<a href="data:text/html,<script>alert(1)</script>">Link</a>',
    );
    expect(result).not.toContain("data:");
    expect(result).toContain("Link");
  });

  // -----------------------------------------------------------------------
  // Safe link post-processing (Blocker 1)
  // -----------------------------------------------------------------------

  it("adds target=_blank and rel=noopener noreferrer to all anchors", () => {
    const result = sanitizeAndMakeSafe(
      '<p>Visit <a href="https://example.com">this site</a></p>',
    );

    // Parse the result to check attributes
    const temp = document.createElement("div");
    temp.innerHTML = result;
    const links = temp.querySelectorAll("a");
    expect(links.length).toBe(1);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("applies safe attributes to multiple links", () => {
    const result = sanitizeAndMakeSafe(
      '<p><a href="https://a.com">A</a> and <a href="https://b.com">B</a></p>',
    );

    const temp = document.createElement("div");
    temp.innerHTML = result;
    const links = temp.querySelectorAll("a");
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  // -----------------------------------------------------------------------
  // Standard sanitization
  // -----------------------------------------------------------------------

  it("strips script tags", () => {
    const result = sanitizeAndMakeSafe(
      '<p>Safe</p><script>alert("xss")</script><p>More</p>',
    );
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Safe</p>");
  });

  it("strips img and iframe tags", () => {
    const result = sanitizeAndMakeSafe(
      '<p>Safe</p><img src="x.png" onerror="bad()"><iframe src="evil"></iframe>',
    );
    expect(result).not.toContain("<img");
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("onerror");
    expect(result).toContain("<p>Safe</p>");
  });

  it("preserves allowed tags", () => {
    const result = sanitizeAndMakeSafe(
      '<h2>Title</h2><p>Text with <strong>bold</strong> and <em>italic</em></p><ul><li>Item</li></ul><blockquote>Quote</blockquote>',
    );
    expect(result).toContain("<h2>");
    expect(result).toContain("<p>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
    expect(result).toContain("<blockquote>");
  });
});
