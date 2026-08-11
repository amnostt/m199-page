import { describe, expect, it } from "vitest";
import { mapAdminError } from "./adminErrors.js";

const GENERIC_ERROR = "No se pudo completar la solicitud. Intenta de nuevo.";

describe("mapAdminError", () => {
  it("maps a known backend message", () => {
    expect(mapAdminError(new Error("Network error")).root).toBe(
      "Error de red.",
    );
  });

  it("uses the generic fallback for an unknown English message", () => {
    expect(
      mapAdminError(new Error("Database outage while processing")).root,
    ).toBe(GENERIC_ERROR);
  });

  it("uses the generic fallback for non-error values", () => {
    expect(mapAdminError(null).root).toBe(GENERIC_ERROR);
  });

  it("maps deletion failures without assuming the resource type", () => {
    expect(mapAdminError(new Error("Delete failed")).root).toBe(
      "No se pudo eliminar el elemento.",
    );
  });

  it("maps mission lifecycle failures", () => {
    expect(mapAdminError(new Error("Mission not found")).root).toBe(
      "No se encontró la misión.",
    );
    expect(mapAdminError(new Error("Cannot change mission status")).root).toBe(
      "No se pudo cambiar el estado de la misión.",
    );
    expect(
      mapAdminError(new Error("heroPhrase should not be empty")).root,
    ).toBe("La frase es obligatoria.");
    expect(mapAdminError(new Error('Mission "m-1" not found')).root).toBe(
      'No se encontró la misión "m-1".',
    );
    expect(
      mapAdminError(
        new Error('FileAsset "file-1" must have category MISSION_HERO'),
      ).root,
    ).toBe('El archivo "file-1" debe ser una imagen hero de misión.');
    expect(
      mapAdminError(new Error("heroImageId should not be empty")).root,
    ).toBe("La imagen es obligatoria.");
  });
});
