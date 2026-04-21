import { describe, expect, it } from "vitest";
import { fixtureRuns } from "@/lib/mocks";
import { deriveDesignSystemSections } from "@/lib/design-system-inference";

describe("design system inference", () => {
  it("derives richer design-system sections from observed result signals", () => {
    const derived = deriveDesignSystemSections(fixtureRuns.singleExperience.result);

    expect(derived.sections.map((section) => section.id)).toEqual([
      "buttons",
      "icons",
      "spacing",
      "material",
      "motion",
      "rendering"
    ]);

    const buttons = derived.sections.find((section) => section.id === "buttons");
    const spacing = derived.sections.find((section) => section.id === "spacing");
    const rendering = derived.sections.find((section) => section.id === "rendering");

    expect(buttons?.meta).toMatch(/styles/i);
    expect(buttons?.metrics.some((metric) => metric.label === "Primary action")).toBe(true);
    expect(spacing?.meta).toBe("4px / 8px / 16px rhythm");
    expect(spacing?.groups?.find((group) => group.label === "Scale")?.values).toContain("4px");
    expect(spacing?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Rail stack", value: "4px" }),
        expect.objectContaining({ label: "Section gap", value: "8px" }),
        expect.objectContaining({ label: "Frame padding", value: "16px" }),
      ])
    );
    expect(rendering?.meta).toBe("DOM-first");
  });
});
