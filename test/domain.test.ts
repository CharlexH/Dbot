import { describe, expect, it } from "vitest";
import {
  buildStageItems,
  createGenerateRequest,
  filterStylePresets,
  normalizePublicUrl
} from "@/lib/dbot";
import { stylePresets } from "@/lib/mocks";

describe("dbot domain helpers", () => {
  it("normalizes public https urls and preserves the original input text", () => {
    const result = normalizePublicUrl("dbot.dev/path?mode=preview");

    expect(result).toEqual({
      isValid: true,
      raw: "dbot.dev/path?mode=preview",
      normalized: "https://dbot.dev/path?mode=preview",
      domain: "dbot.dev"
    });
  });

  it("rejects empty and non-http urls", () => {
    expect(normalizePublicUrl("")).toMatchObject({
      isValid: false,
      reason: "Enter a public website URL."
    });

    expect(normalizePublicUrl("ftp://dbot.dev")).toMatchObject({
      isValid: false,
      reason: "Use an http or https website URL."
    });
  });

  it("filters gallery presets by category", () => {
    expect(filterStylePresets(stylePresets, "All")).toHaveLength(stylePresets.length);
    expect(filterStylePresets(stylePresets, "Fintech").every((item) => item.categories.includes("Fintech"))).toBe(true);
  });

  it("builds ordered stage items with complete/current/idle states", () => {
    expect(buildStageItems("Generate").map((item) => `${item.label}:${item.status}`)).toEqual([
      "Discover:complete",
      "Partition:complete",
      "Extract:complete",
      "Generate:current",
      "Validate:idle"
    ]);
  });

  it("creates a request payload with normalized url and style context", () => {
    const request = createGenerateRequest({
      url: "example.com",
      selectedPresetId: "intercom",
      selectedCategory: "AI"
    });

    expect(request).toEqual({
      url: "https://example.com",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["AI"]
    });
  });
});
