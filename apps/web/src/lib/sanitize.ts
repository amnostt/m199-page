/**
 * Shared web sanitizer — defense-in-depth HTML sanitization for posts.
 *
 * Uses DOMPurify to strip disallowed tags/attributes/schemes and then
 * post-processes all anchor elements to enforce safe external link behavior.
 *
 * Allowed schemes: https, http, mailto — no protocol-relative URLs.
 * Allowed tags: p, h2, h3, strong, em, ul, ol, li, a, blockquote, br.
 * Allowed attributes: a.href only.
 */
import DOMPurify from "dompurify";

/**
 * Sanitize HTML content and apply safe link attributes to all anchors.
 *
 * Two-phase processing:
 * 1. DOMPurify strips disallowed tags, attributes, and unsafe URL schemes.
 * 2. All surviving <a> elements receive target="_blank" and
 *    rel="noopener noreferrer" for safe external links.
 */
export function sanitizeAndMakeSafe(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: ["href"],
    // Only allow https://, http://, and mailto: — no protocol-relative
    // URLs (//evil.com), no javascript:, no data: URIs.
    ALLOWED_URI_REGEXP: /^(https?:\/\/|mailto:)/i,
  });

  // Post-process: add safe link attributes to all <a> elements.
  const temp = document.createElement("div");
  temp.innerHTML = clean;
  temp.querySelectorAll("a").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
  return temp.innerHTML;
}
