type LandingSeedTextField =
  | "heroTitle"
  | "heroSubtitle"
  | "mission"
  | "vision"
  | "description"
  | "contactEmail"
  | "contactPhone";

type NullableLandingSeedText = Record<LandingSeedTextField, string | null>;

type LandingSettingsSeedClient = {
  landingSettings: {
    findUnique: (args: {
      where: { id: 1 };
    }) => Promise<Partial<NullableLandingSeedText> | null>;
    create: (args: {
      data: { id: 1 } & NullableLandingSeedText;
    }) => Promise<unknown>;
    update: (args: {
      where: { id: 1 };
      data: Partial<NullableLandingSeedText>;
    }) => Promise<unknown>;
  };
};

export const DEFAULT_LANDING_SETTINGS: NullableLandingSeedText = {
  heroTitle: "Misión 1-99",
  heroSubtitle:
    "Acompañamos a comunidades y familias con esperanza, servicio y fe.",
  mission:
    "Servir con amor, construir vínculos y compartir recursos que transformen vidas.",
  vision:
    "Ver comunidades fortalecidas, unidas y activas en el cuidado de cada persona.",
  description:
    "Somos una misión comprometida con acercar ayuda concreta, acompañamiento espiritual y oportunidades de encuentro para quienes más lo necesitan.",
  contactEmail: "contacto@mision199.org",
  contactPhone: "+54 9 11 0000-0000",
};

export function buildMissingLandingSettingsDefaults(
  existing: Partial<NullableLandingSeedText>,
): Partial<NullableLandingSeedText> {
  return Object.fromEntries(
    Object.entries(DEFAULT_LANDING_SETTINGS).filter(
      ([field]) => existing[field as LandingSeedTextField] == null,
    ),
  ) as Partial<NullableLandingSeedText>;
}

export async function seedLandingSettings(
  prisma: LandingSettingsSeedClient,
): Promise<void> {
  const existing = await prisma.landingSettings.findUnique({
    where: { id: 1 },
  });

  if (!existing) {
    await prisma.landingSettings.create({
      data: {
        id: 1,
        ...DEFAULT_LANDING_SETTINGS,
      },
    });
    return;
  }

  const missingDefaults = buildMissingLandingSettingsDefaults(existing);

  if (Object.keys(missingDefaults).length === 0) {
    return;
  }

  await prisma.landingSettings.update({
    where: { id: 1 },
    data: missingDefaults,
  });
}
