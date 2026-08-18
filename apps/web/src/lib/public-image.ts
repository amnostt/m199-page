export const PUBLIC_IMAGE_FALLBACK = "/assets/template-picture.png";
export const PUBLIC_IMAGE_FALLBACK_HANDLER = `this.onerror=null;this.src='${PUBLIC_IMAGE_FALLBACK}'`;

export function resolvePublicImageUrl(
  imageUrl: string | null | undefined,
): string {
  return imageUrl?.trim() ? imageUrl : PUBLIC_IMAGE_FALLBACK;
}
