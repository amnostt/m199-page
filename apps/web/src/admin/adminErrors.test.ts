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
});
