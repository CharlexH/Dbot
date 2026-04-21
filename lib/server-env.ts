export function getServerGeminiApiKey(): string | undefined {
  const value = process.env.DBOT_GEMINI_API_KEY?.trim();
  return value ? value : undefined;
}

export function getServerGeminiModel(): string | undefined {
  const value = process.env.DBOT_GEMINI_MODEL?.trim();
  return value ? value : undefined;
}

export function hasServerGeminiApiKey(): boolean {
  return Boolean(getServerGeminiApiKey());
}
