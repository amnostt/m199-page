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
    [/^Mission not found$/i, "No se encontró la misión."],
    [/^Publication not found$/i, "No se encontró la publicación."],
    [
      /^POST publications cannot have activityDate$/i,
      "Las publicaciones POST no pueden tener fecha de actividad.",
    ],
    [
      /^Activity publications require activityDate$/i,
      "Las publicaciones de actividad requieren fecha de actividad.",
    ],
    [
      /^GENERAL publications cannot have missions$/i,
      "Las publicaciones generales no pueden tener misiones.",
    ],
    [
      /^MISSION publications require at least one mission$/i,
      "Las publicaciones de misión requieren al menos una misión.",
    ],
    [
      /^All linked missions must be ACTIVE$/i,
      "Todas las misiones vinculadas deben estar activas.",
    ],
    [
      /^confirmTypeChange is required when changing publication type$/i,
      "confirmTypeChange es obligatorio al cambiar el tipo de publicación.",
    ],
    [
      /^Cannot change mission status$/i,
      "No se pudo cambiar el estado de la misión.",
    ],
    [/^heroPhrase should not be empty$/i, "La frase es obligatoria."],
    [/^heroImageId should not be empty$/i, "La imagen es obligatoria."],
    [/^title should not be empty$/i, "El título es obligatorio."],
    [/^title is required$/i, "El título es obligatorio."],
    [/^slug must be unique$/i, "El slug debe ser único."],
    [/^Title is required\.$/i, "El título es obligatorio."],
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
    [
      /^FileAsset with id "(.+)" not found$/i,
      'No se encontró el archivo "$1".',
    ],
    [/^Slug "(.+)" already exists$/i, 'El slug "$1" ya existe.'],
    [/^Mission "(.+)" not found$/i, 'No se encontró la misión "$1".'],
    [/^Publication "(.+)" not found$/i, 'No se encontró la publicación "$1".'],
    [
      /^FileAsset "(.+)" must have category PUBLICATION_FEATURED_IMAGE$/i,
      'El archivo "$1" debe ser una imagen destacada de publicación.',
    ],
    [
      /^FileAsset "(.+)" must have category MISSION_HERO$/i,
      'El archivo "$1" debe ser una imagen hero de misión.',
    ],
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
