import sanitizeHtml from "sanitize-html";

const allowedTags = [
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
];

/**
 * Sanitizes publication content before Astro serializes it into SSR HTML.
 * DOMPurify remains available for browser-side consumers, but cannot be the
 * first sanitizer here because this code runs without a browser document.
 */
export function sanitizePublicationContentForSsr(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}
