import { describe, expect, it } from "vitest";
import {
  formatPublicDate,
  getPublicationCta,
  getPublicationDate,
  getPublicationTimelineLabel,
} from "./public-content.js";

describe("public publication presentation helpers", () => {
  const now = new Date("2026-09-16T17:30:00.000Z");

  it("classifies activity dates in America/Lima civil time", () => {
    expect(
      getPublicationTimelineLabel(
        { type: "EVENT", activityDate: "2026-09-16" },
        now,
      ),
    ).toBe("Es hoy");
    expect(
      getPublicationTimelineLabel(
        { type: "OUTING", activityDate: "2026-09-17" },
        now,
      ),
    ).toBe("Próximamente");
    expect(
      getPublicationTimelineLabel(
        { type: "EVENT", activityDate: "2026-09-15" },
        now,
      ),
    ).toBe("Revive lo que hicimos");
  });

  it("uses activityDate for activities and publishedAt for posts", () => {
    expect(
      getPublicationDate({
        type: "EVENT",
        activityDate: "2026-09-17",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("2026-09-17");
    expect(
      getPublicationDate({
        type: "POST",
        activityDate: "2026-09-17",
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("2026-01-01T00:00:00.000Z");
    expect(formatPublicDate("2026-09-17")).toContain("17");
  });

  it.each([
    ["POST", "Ver publicación"],
    ["EVENT", "Ver evento"],
    ["OUTING", "Ver salida"],
  ])("returns the exact CTA for %s", (type, cta) => {
    expect(getPublicationCta(type)).toBe(cta);
  });
});
