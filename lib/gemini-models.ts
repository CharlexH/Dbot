export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

export const GEMINI_MODEL_OPTIONS = [
  { id: DEFAULT_GEMINI_MODEL, label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" }
] as const;

const LEGACY_GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-2.0-flash": DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash-preview-04-17": "gemini-3-flash-preview",
  "gemini-2.5-pro-preview-05-06": "gemini-3.1-pro-preview"
};

export function normalizeGeminiModel(model?: string | null): string | undefined {
  const value = model?.trim();
  if (!value) {
    return undefined;
  }

  return LEGACY_GEMINI_MODEL_ALIASES[value] ?? value;
}

export function resolveGeminiModel(model?: string | null): string {
  return normalizeGeminiModel(model) ?? DEFAULT_GEMINI_MODEL;
}
