export const URL_SAFE_SLUG_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

const URL_SAFE_SLUG_REGEX = new RegExp(URL_SAFE_SLUG_PATTERN);

export const URL_SAFE_SLUG_DESCRIPTION =
  "Usa letras minúsculas ASCII y números, separados opcionalmente por guiones simples (por ejemplo, mision-centro-2026).";
export const URL_SAFE_SLUG_ERROR = `El slug no es válido. ${URL_SAFE_SLUG_DESCRIPTION}`;

export const suggestSlugFromTitle = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const isUrlSafeSlug = (value: string): boolean =>
  URL_SAFE_SLUG_REGEX.test(value);
