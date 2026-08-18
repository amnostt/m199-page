import { describe, expect, it, vi } from "vitest";

import {
  buildMissingLandingSettingsDefaults,
  DEFAULT_LANDING_SETTINGS,
  seedLandingSettings,
} from "./landing-seed.js";

describe("landing settings seed defaults", () => {
  it("keeps user-readable defaults in Spanish", () => {
    expect(DEFAULT_LANDING_SETTINGS).toMatchObject({
      heroTitle: "Misión 1-99",
      heroSubtitle:
        "Acompañamos a comunidades y familias con esperanza, servicio y fe.",
      mission:
        "Servir con amor, construir vínculos y compartir recursos que transformen vidas.",
      vision:
        "Ver comunidades fortalecidas, unidas y activas en el cuidado de cada persona.",
      description:
        "Somos una misión comprometida con acercar ayuda concreta, acompañamiento espiritual y oportunidades de encuentro para quienes más lo necesitan.",
      verseText: "No nos cansemos de hacer el bien.",
      verseReference: "Gálatas 6:9",
    });
  });

  it("fills every default text field when the settings row is missing values", () => {
    expect(buildMissingLandingSettingsDefaults({})).toEqual(
      DEFAULT_LANDING_SETTINGS,
    );
  });

  it("does not overwrite admin-provided values", () => {
    expect(
      buildMissingLandingSettingsDefaults({
        heroTitle: "Custom title",
        mission: "Custom mission",
      }),
    ).toEqual({
      heroSubtitle: DEFAULT_LANDING_SETTINGS.heroSubtitle,
      vision: DEFAULT_LANDING_SETTINGS.vision,
      description: DEFAULT_LANDING_SETTINGS.description,
      contactEmail: DEFAULT_LANDING_SETTINGS.contactEmail,
      contactPhone: DEFAULT_LANDING_SETTINGS.contactPhone,
      verseText: DEFAULT_LANDING_SETTINGS.verseText,
      verseReference: DEFAULT_LANDING_SETTINGS.verseReference,
    });
  });
});

describe("seedLandingSettings", () => {
  it("creates the singleton settings row with defaults when it does not exist", async () => {
    const prisma = {
      landingSettings: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    await seedLandingSettings(prisma);

    expect(prisma.landingSettings.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(prisma.landingSettings.create).toHaveBeenCalledWith({
      data: {
        id: 1,
        ...DEFAULT_LANDING_SETTINGS,
      },
    });
    expect(prisma.landingSettings.update).not.toHaveBeenCalled();
  });

  it("updates only missing fields and preserves non-null admin values", async () => {
    const prisma = {
      landingSettings: {
        findUnique: vi.fn().mockResolvedValue({
          heroTitle: "",
          heroSubtitle: "Custom subtitle",
          mission: null,
          vision: "Custom vision",
          description: null,
          contactEmail: "admin@example.com",
          contactPhone: "",
          verseText: null,
          verseReference: "Custom reference",
        }),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    await seedLandingSettings(prisma);

    expect(prisma.landingSettings.create).not.toHaveBeenCalled();
    expect(prisma.landingSettings.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        mission: DEFAULT_LANDING_SETTINGS.mission,
        description: DEFAULT_LANDING_SETTINGS.description,
        verseText: DEFAULT_LANDING_SETTINGS.verseText,
      },
    });
  });

  it("does nothing when every seed field already has a non-null value", async () => {
    const prisma = {
      landingSettings: {
        findUnique: vi.fn().mockResolvedValue({
          heroTitle: "",
          heroSubtitle: "Custom subtitle",
          mission: "Custom mission",
          vision: "Custom vision",
          description: "Custom description",
          contactEmail: "admin@example.com",
          contactPhone: "",
          verseText: "Custom verse",
          verseReference: "Custom reference",
        }),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    await seedLandingSettings(prisma);

    expect(prisma.landingSettings.create).not.toHaveBeenCalled();
    expect(prisma.landingSettings.update).not.toHaveBeenCalled();
  });
});
