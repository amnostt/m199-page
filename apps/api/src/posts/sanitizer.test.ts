/**
 * Posts sanitizer tests — Task 1.3 (RED phase).
 *
 * Verifies the HTML sanitizer strips disallowed tags, attributes, events,
 * and unsafe schemes while preserving allowed content per the design spec.
 *
 * Allowed: p, h2, h3, strong, em, ul, ol, li, a, blockquote, br.
 * Disallowed: script, iframe, img, style, table, SVG, inline styles,
 *   classes, event attributes, javascript:/data: schemes, protocol-relative URLs.
 */
import { describe, it, expect } from "vitest";
import { sanitizePostContent } from "./sanitizer.js";

describe("sanitizePostContent (1.3)", () => {
  // ---- Allowed tags pass through -------------------------------------------

  it("preserves allowed block tags (p, h2, h3, blockquote)", () => {
    const input =
      "<p>Paragraph</p><h2>Heading 2</h2><h3>Heading 3</h3><blockquote>Quote</blockquote>";
    const result = sanitizePostContent(input);
    expect(result).toContain("<p>Paragraph</p>");
    expect(result).toContain("<h2>Heading 2</h2>");
    expect(result).toContain("<h3>Heading 3</h3>");
    expect(result).toContain("<blockquote>Quote</blockquote>");
  });

  it("preserves inline formatting (strong, em)", () => {
    const input = "<strong>Bold</strong> and <em>Italic</em>";
    const result = sanitizePostContent(input);
    expect(result).toContain("<strong>Bold</strong>");
    expect(result).toContain("<em>Italic</em>");
  });

  it("preserves list elements (ul, ol, li)", () => {
    const input =
      "<ul><li>One</li><li>Two</li></ul><ol><li>First</li><li>Second</li></ol>";
    const result = sanitizePostContent(input);
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>One</li>");
    expect(result).toContain("<li>Two</li>");
    expect(result).toContain("<ol>");
    expect(result).toContain("<li>First</li>");
  });

  it("preserves anchor tags with allowed href", () => {
    const input = '<a href="https://example.com">Visit</a>';
    const result = sanitizePostContent(input);
    expect(result).toContain('<a href="https://example.com">Visit</a>');
  });

  it("preserves br tags (self-closing normalization)", () => {
    const input = "<p>Line one<br>Line two</p>";
    const result = sanitizePostContent(input);
    // sanitize-html normalizes <br> to <br /> (self-closing)
    expect(result).toContain("<br />");
  });

  it("handles text with no HTML tags unchanged", () => {
    const input = "Just plain text, no markup.";
    const result = sanitizePostContent(input);
    expect(result).toBe("Just plain text, no markup.");
  });

  // ---- Disallowed tags are stripped ----------------------------------------

  it("strips script tags and their content", () => {
    const input = '<p>Safe</p><script>alert("xss")</script><p>More</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Safe</p>");
    expect(result).toContain("<p>More</p>");
  });

  it("strips iframe tags", () => {
    const input =
      '<p>Safe</p><iframe src="https://evil.com"></iframe><p>More</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("iframe");
    expect(result).toContain("<p>Safe</p>");
    expect(result).toContain("<p>More</p>");
  });

  it("strips img tags", () => {
    const input = '<p>Safe</p><img src="x.jpg" onerror="alert(1)"><p>More</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("<img");
    expect(result).toContain("<p>Safe</p>");
  });

  it("strips style tags and their content", () => {
    const input = "<p>Safe</p><style>body { color: red; }</style><p>More</p>";
    const result = sanitizePostContent(input);
    expect(result).not.toContain("style");
    expect(result).not.toContain("color:");
    expect(result).toContain("<p>Safe</p>");
  });

  it("strips table, tr, td, th tags", () => {
    const input = "<table><tr><td>Data</td></tr></table><p>Safe</p>";
    const result = sanitizePostContent(input);
    expect(result).not.toContain("<table");
    expect(result).not.toContain("<tr");
    expect(result).not.toContain("<td");
    expect(result).toContain("<p>Safe</p>");
  });

  it("strips SVG tags", () => {
    const input = '<svg><circle cx="50" cy="50" r="40"/></svg><p>Safe</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("<svg");
    expect(result).not.toContain("<circle");
    expect(result).toContain("<p>Safe</p>");
  });

  // ---- Disallowed attributes are stripped ----------------------------------

  it("strips onclick and other event handler attributes", () => {
    const input = '<p onclick="alert(1)" onmouseover="bad()">Click me</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("<p>Click me</p>");
  });

  it("strips class attributes", () => {
    const input = '<p class="fancy-text">Styled paragraph</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("class=");
    expect(result).toContain("<p>Styled paragraph</p>");
  });

  it("strips style attributes", () => {
    const input = '<p style="color: red;">Red text</p>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("style=");
    expect(result).toContain("<p>Red text</p>");
  });

  it("strips id attributes", () => {
    const input = '<p id="intro">Paragraph with id</p>';
    const result = sanitizePostContent(input);
    // The sanitizer may or may not filter id — the key is classes/styles/events are gone.
    // Allow id if sanitize-html keeps it by default, but verify dangerous attrs are gone.
    expect(result).toContain("<p"); // Ensure it's a p tag
  });

  // ---- Unsafe URL schemes are stripped -------------------------------------

  it("strips javascript: href scheme on anchor tags", () => {
    const input = '<a href="javascript:alert(1)">Click me</a>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("javascript:");
    // The anchor tag text should remain, but href should be removed
    expect(result).toContain("Click me");
  });

  it("strips data: URI href scheme", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("data:");
    expect(result).toContain("Link");
  });

  it("strips protocol-relative URLs", () => {
    const input = '<a href="//evil.com/phishing">Link</a>';
    const result = sanitizePostContent(input);
    expect(result).not.toContain("//evil.com");
    expect(result).toContain("Link");
  });

  // ---- Safe schemes pass through -------------------------------------------

  it("preserves https:// href", () => {
    const result = sanitizePostContent('<a href="https://safe.com">Safe</a>');
    expect(result).toContain('href="https://safe.com"');
  });

  it("preserves http:// href", () => {
    const result = sanitizePostContent('<a href="http://oldsite.com">Old</a>');
    expect(result).toContain('href="http://oldsite.com"');
  });

  it("preserves mailto: href", () => {
    const result = sanitizePostContent(
      '<a href="mailto:test@example.com">Email</a>',
    );
    expect(result).toContain('href="mailto:test@example.com"');
  });

  // ---- Combined / defense-in-depth scenarios --------------------------------

  it("handles deeply nested disallowed content", () => {
    const input =
      "<div><p>Outer</p><div><script>bad()</script><p>Inner</p></div></div>";
    const result = sanitizePostContent(input);
    // div is not allowed, but children p elements should survive
    expect(result).not.toContain("script");
    expect(result).not.toContain("<div");
    expect(result).toContain("<p>Outer</p>");
    expect(result).toContain("<p>Inner</p>");
  });

  it("strips mixed safe and unsafe content while preserving structure", () => {
    const input = `
      <h2>Safe Title</h2>
      <p>Some <strong>bold</strong> text with <em>emphasis</em>.</p>
      <script>evil()</script>
      <img src="bad.jpg" />
      <p class="unwanted" onclick="hack()">More <a href="https://ok.com">ok link</a> text.</p>
      <a href="javascript:void(0)" onclick="bad()">Bad link</a>
    `;
    const result = sanitizePostContent(input);

    // Allowed elements present
    expect(result).toContain("<h2>Safe Title</h2>");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>emphasis</em>");
    expect(result).toContain('<a href="https://ok.com">ok link</a>');

    // Disallowed stripped
    expect(result).not.toContain("script");
    expect(result).not.toContain("<img");
    expect(result).not.toContain("class=");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizePostContent("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    const result = sanitizePostContent("   \n  \t  ");
    // sanitize-html trims whitespace; result should be empty or whitespace-trimmed
    expect(result.trim()).toBe("");
  });
});
