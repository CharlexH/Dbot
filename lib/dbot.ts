import { JOB_STAGES, GenerateRequestPayload, JobStageName, StageItem, StylePreset, UrlValidationState } from "@/types/dbot";

export function normalizePublicUrl(rawInput: string): UrlValidationState {
  const raw = rawInput.trim();

  if (!raw) {
    return { isValid: false, raw, reason: "Enter a public website URL." };
  }

  const candidate = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { isValid: false, raw, reason: "Use an http or https website URL." };
    }

    const normalized =
      parsed.pathname === "/" && !parsed.search && !parsed.hash ? parsed.toString().replace(/\/$/, "") : parsed.toString();

    return {
      isValid: true,
      raw,
      normalized,
      domain: parsed.hostname
    };
  } catch {
    return { isValid: false, raw, reason: "Enter a valid public website URL." };
  }
}

export function filterStylePresets(presets: StylePreset[], selectedCategory: string): StylePreset[] {
  if (selectedCategory === "All") {
    return presets;
  }

  return presets.filter((preset) => preset.categories.includes(selectedCategory));
}

export function buildStageItems(currentStage: JobStageName): StageItem[] {
  const currentIndex = JOB_STAGES.indexOf(currentStage);

  return JOB_STAGES.map((label, index) => ({
    label,
    status: index < currentIndex ? "complete" : index === currentIndex ? "current" : "idle"
  }));
}

export function createGenerateRequest(params: {
  url: string;
  selectedPresetId: string;
  selectedCategory: string;
}): GenerateRequestPayload {
  const normalized = normalizePublicUrl(params.url);

  if (!normalized.isValid || !normalized.normalized) {
    throw new Error(normalized.reason ?? "Invalid website URL");
  }

  return {
    url: normalized.normalized,
    selectedPresetIds: [params.selectedPresetId],
    selectedCategoryIds: [params.selectedCategory]
  };
}
