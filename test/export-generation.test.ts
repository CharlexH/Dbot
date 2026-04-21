import { describe, expect, it } from "vitest";
import { fixtureRuns } from "@/lib/mocks";
import { buildExportArtifacts } from "@/lib/exports";

describe("export generation", () => {
  it("creates semantic Tailwind and CSS variable exports instead of positional placeholders", () => {
    const result = fixtureRuns.singleExperience.result;
    const exports = buildExportArtifacts({
      result,
      meta: {
        confidence: "high",
        pageCount: 3,
        failureCount: 0
      }
    });

    const tailwind = exports.find((artifact) => artifact.tab === "Tailwind v4");
    const cssVariables = exports.find((artifact) => artifact.tab === "CSS Variables");

    expect(tailwind?.content).toContain("--color-midnight-ink");
    expect(tailwind?.content).toContain("--font-display");
    expect(tailwind?.content).not.toContain("--color-1");

    expect(cssVariables?.content).toContain("--midnight-ink:");
    expect(cssVariables?.content).toContain("--font-body:");
  });

  it("splits DESIGN.md into observed, derived, and synthesized sections", () => {
    const result = fixtureRuns.singleExperience.result;
    const exports = buildExportArtifacts({
      result,
      meta: {
        confidence: "high",
        pageCount: 3,
        failureCount: 0
      }
    });

    const designMarkdown = exports.find((artifact) => artifact.tab === "DESIGN.md")?.content ?? "";

    expect(designMarkdown).toContain("## Observed Facts");
    expect(designMarkdown).toContain("## Derived Interpretation");
    expect(designMarkdown).toContain("## Synthesized Guidance");
    expect(designMarkdown).not.toContain("## Brand Summary");
  });

  it("embeds export metadata and evidence summary into design json and design tokens", () => {
    const result = fixtureRuns.multiExperience.result;
    const exports = buildExportArtifacts({
      result,
      meta: {
        confidence: "medium",
        pageCount: 2,
        failureCount: 1
      }
    });

    const designJson = JSON.parse(exports.find((artifact) => artifact.tab === "Design JSON")?.content ?? "{}");
    const designTokens = JSON.parse(exports.find((artifact) => artifact.tab === "Design Tokens")?.content ?? "{}");

    expect(designJson.provenanceVersion).toBe(1);
    expect(designJson.observed.palette).toBeTruthy();
    expect(designJson.derived.sections.value.map((section: { id: string }) => section.id)).toEqual([
      "buttons",
      "icons",
      "spacing",
      "material",
      "motion",
      "rendering"
    ]);
    expect(designJson.synthesis.guidelines).toBeTruthy();
    expect(designJson.compat.palette).toEqual(result.palette);
    expect(designJson.meta).toEqual({
      confidence: "medium",
      evidence: {
        pageCount: 2,
        failureCount: 1
      },
      includesPartitionAppendix: true,
      provenanceWarnings: []
    });
    expect(designJson.includesPartitionAppendix).toBe(true);

    expect(designTokens.meta).toEqual({
      confidence: "medium",
      pageCount: 2,
      failureCount: 1,
      includesPartitionAppendix: true
    });
    expect(designTokens.color["midnight-ink"].value).toBe("#191C1F");
    expect(designTokens.typography.display.family).toContain("Georgia");
    expect(designTokens.inferred.buttons.title).toBe("Buttons");
    expect(designTokens.inferred.spacing.meta).toBe("4px / 8px / 16px rhythm");
    expect(designTokens.inferred.spacing.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Rail stack", value: "4px" }),
        expect.objectContaining({ label: "Section gap", value: "8px" }),
        expect.objectContaining({ label: "Frame padding", value: "16px" }),
      ])
    );
  });
});
