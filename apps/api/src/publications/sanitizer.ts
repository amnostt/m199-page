/**
 * Publication HTML sanitizer.
 *
 * Backend defense-in-depth: sanitizes publication HTML content before
 * persistence. Strips disallowed tags, attributes, events, and unsafe
 * URL schemes.
 *
 * Allowed: p, h2, h3, strong, em, ul, ol, li, a, blockquote, br.
 * Allowed attributes: a.href (only http, https, mailto schemes).
 * Disallowed: scripts, iframes, images, tables, styles, inline styles,
 *   classes, event attributes, SVG, protocol-relative URLs, data: URIs.
 *
 * This module lives under publications/ — it operates on the
 * Publication.content field for the Mission/Publication domain reset.
 * The sanitizer allowlist is preserved from the legacy posts sanitizer.
 */
import sanitizeHtml from "sanitize-html";

export const PUBLICATION_ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "br",
] as const;

export const PUBLICATION_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href"],
};

export const PUBLICATION_ALLOWED_SCHEMES = ["http", "https", "mailto"] as const;

/**
 * Sanitizes publication HTML content, stripping everything not in the
 * allowlist.
 *
 * @param html - Raw HTML content (may include unsafe tags/attrs)
 * @returns Sanitized HTML containing only allowed tags and attributes
 */
export function sanitizePublicationContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...PUBLICATION_ALLOWED_TAGS],
    allowedAttributes: PUBLICATION_ALLOWED_ATTRIBUTES,
    allowedSchemes: [...PUBLICATION_ALLOWED_SCHEMES],
    // Apply scheme filtering only to href attributes
    allowedSchemesAppliedToAttributes: ["href"],
    // Disallow protocol-relative URLs (//evil.com)
    allowProtocolRelative: false,
    // Strip disallowed tags completely (don't escape them)
    disallowedTagsMode: "discard",
  });
}
