export interface AdminRequestError extends Error {
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  retryable?: boolean;
}

const GENERIC_ERROR = "No se pudo completar la solicitud. Intenta de nuevo.";

function localizeMessage(message: string): string {
  const translations: Array<
    [RegExp, string | ((match: RegExpMatchArray) => string)]
  > = [
    [/^Network error$/i, "Error de red."],
    [/^Login failed$/i, "No se pudo iniciar sesión."],
    [/^Logout failed$/i, "No se pudo cerrar sesión."],
    [/^Session expired$/i, "La sesión expiró. Inicia sesión nuevamente."],
    [/^Session refresh failed$/i, "No se pudo renovar la sesión."],
    [/^Delete failed$/i, "No se pudo eliminar el elemento."],
    [/^Create failed$/i, "No se pudo crear el versículo."],
    [/^Cannot change$/i, "No se pudo cambiar el estado."],
    [
      /^Cannot archive an outing that has dependent content$/i,
      "No se puede archivar una salida que tiene contenido dependiente.",
    ],
    [/^Internal server error$/i, "Error interno del servidor."],
    [/^Admin request failed$/i, GENERIC_ERROR],
    [/^The request failed\. Please try again\.$/i, GENERIC_ERROR],
    [/^Invalid credentials$/i, "Las credenciales no son válidas."],
    [/^User not found$/i, "No se encontró el usuario."],
    [/^User is inactive$/i, "El usuario está inactivo."],
    [/^Email already in use$/i, "El correo electrónico ya está en uso."],
    [/^Email already exists$/i, "El correo electrónico ya existe."],
    [/^File not found$/i, "No se encontró el archivo."],
    [/^File is required$/i, "El archivo es obligatorio."],
    [/^File too large$/i, "El archivo es demasiado grande."],
    [/^Invalid file category$/i, "La categoría del archivo no es válida."],
    [
      /^No available featured slot$/i,
      "No hay un lugar disponible para destacar.",
    ],
    [/^Slug already exists$/i, "El slug ya existe."],
    [
      /^Only PUBLISHED posts can be archived$/i,
      "Sólo se pueden archivar publicaciones publicadas.",
    ],
    [
      /^Only PUBLISHED posts can be featured$/i,
      "Sólo se pueden destacar publicaciones publicadas.",
    ],
    [/^title should not be empty$/i, "El título es obligatorio."],
    [/^title is required$/i, "El título es obligatorio."],
    [/^slug must be unique$/i, "El slug debe ser único."],
    [/^Title is required\.$/i, "El título es obligatorio."],
    [/^Reference is required\.$/i, "La referencia es obligatoria."],
    [/^Text is required\.$/i, "El texto es obligatorio."],
    [/^Email is required\.$/i, "El correo electrónico es obligatorio."],
    [/^Display name is required\.$/i, "El nombre visible es obligatorio."],
    [
      /^Password must be at least 8 characters\.$/i,
      "La contraseña debe tener al menos 8 caracteres.",
    ],
  ];

  for (const [pattern, translation] of translations) {
    const match = message.match(pattern);
    if (match)
      return typeof translation === "function"
        ? translation(match)
        : translation;
  }

  for (const [pattern, translation] of [
    [/^Post "(.+)" not found$/i, 'No se encontró la publicación "$1".'],
    [/^Outing "(.+)" not found$/i, 'No se encontró la salida "$1".'],
    [/^Verse "(.+)" not found$/i, 'No se encontró el versículo "$1".'],
    [
      /^FileAsset with id "(.+)" not found$/i,
      'No se encontró el archivo "$1".',
    ],
    [/^Slug "(.+)" already exists$/i, 'El slug "$1" ya existe.'],
  ] as Array<[RegExp, string]>) {
    const match = message.match(pattern);
    if (match) return translation.replace("$1", match[1]!);
  }

  return GENERIC_ERROR;
}

export function mapAdminError(error: unknown) {
  const value = error as Partial<AdminRequestError> | null;
  return {
    root:
      error instanceof Error ? localizeMessage(error.message) : GENERIC_ERROR,
    fields: value?.fieldErrors ?? {},
    retryable: value?.retryable ?? true,
  };
}
