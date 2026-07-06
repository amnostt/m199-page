import { describe, expect, it, vi } from "vitest";

import {
  buildMissingLandingSettingsDefaults,
  DEFAULT_LANDING_SETTINGS,
  seedLandingSettings,
} from "./landing-seed.js";

describe("landing settings seed defaults", () => {
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
