import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithGemini } from "@/lib/gemini";
import { createJobRecord } from "@/lib/jobs";

const mocks = vi.hoisted(() => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(() => ({
    models: {
      generateContent
    }
  }));

  return {
    generateContent,
    GoogleGenAI
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: mocks.GoogleGenAI
}));

afterEach(() => {
  delete process.env.DBOT_GEMINI_API_KEY;
  delete process.env.DBOT_GEMINI_MODEL;
  mocks.generateContent.mockReset();
  mocks.GoogleGenAI.mockClear();
});

describe("gemini env fallback", () => {
  it("uses Gemini 3.1 Flash Lite when neither the job nor env provides a model", async () => {
    process.env.DBOT_GEMINI_API_KEY = "server-key";

    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        overview: "Measured product system with clear hierarchy.",
        palette: [{ name: "Primary Ink", value: "#111111", role: "Primary text" }],
        typography: [{ name: "Body", family: "Inter", weight: "400", size: "16px", lineHeight: "1.5", usage: "Body copy", sample: "Dbot" }],
        spacing: [{ name: "sm", value: "8px" }],
        shadows: [{ name: "sm", value: "0 1px 2px rgba(0,0,0,0.05)" }],
        borderRadii: ["8px"],
        components: [{ label: "Buttons", detail: "Rounded 8px primary actions." }],
        guidelines: { dos: ["Keep hierarchy crisp."], donts: ["Over-decorate surfaces."] }
      })
    });

    const job = {
      ...createJobRecord({
        url: "https://dbot.dev",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["AI"]
      }),
      evidence: {
        pages: [
          {
            url: "https://dbot.dev",
            title: "Dbot",
            headings: ["Dbot"],
            description: "Signal-led extraction",
            textSnippets: ["Signal-led extraction"],
            accentColors: ["#111111"],
            backgroundColors: ["#FFFFFF"],
            fontFamilies: ["Inter"],
            fontSizes: ["16px"],
            fontWeights: ["400"],
            lineHeights: ["1.5"],
            borderRadii: ["8px"],
            boxShadows: ["0 1px 2px rgba(0,0,0,0.05)"],
            spacingValues: ["8px"]
          }
        ],
        failures: []
      }
    };

    await generateWithGemini(job, {
      siteTitle: "Dbot",
      vibe: "Measured",
      narrative: "Signal-led extraction",
      tags: ["clean"],
      confidence: "high",
      partitions: [],
      riskLabels: []
    });

    expect(mocks.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "server-key" });
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.1-flash-lite-preview" }));
  });

  it("uses the server-side Gemini API key and model when the job does not carry one", async () => {
    process.env.DBOT_GEMINI_API_KEY = "server-key";
    process.env.DBOT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        overview: "Measured product system with clear hierarchy.",
        palette: [{ name: "Primary Ink", value: "#111111", role: "Primary text" }],
        typography: [{ name: "Body", family: "Inter", weight: "400", size: "16px", lineHeight: "1.5", usage: "Body copy", sample: "Dbot" }],
        spacing: [{ name: "sm", value: "8px" }],
        shadows: [{ name: "sm", value: "0 1px 2px rgba(0,0,0,0.05)" }],
        borderRadii: ["8px"],
        components: [{ label: "Buttons", detail: "Rounded 8px primary actions." }],
        guidelines: { dos: ["Keep hierarchy crisp."], donts: ["Over-decorate surfaces."] }
      })
    });

    const job = {
      ...createJobRecord({
        url: "https://dbot.dev",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["AI"]
      }),
      evidence: {
        pages: [
          {
            url: "https://dbot.dev",
            title: "Dbot",
            headings: ["Dbot"],
            description: "Signal-led extraction",
            textSnippets: ["Signal-led extraction"],
            accentColors: ["#111111"],
            backgroundColors: ["#FFFFFF"],
            fontFamilies: ["Inter"],
            fontSizes: ["16px"],
            fontWeights: ["400"],
            lineHeights: ["1.5"],
            borderRadii: ["8px"],
            boxShadows: ["0 1px 2px rgba(0,0,0,0.05)"],
            spacingValues: ["8px"]
          }
        ],
        failures: []
      }
    };

    await generateWithGemini(job, {
      siteTitle: "Dbot",
      vibe: "Measured",
      narrative: "Signal-led extraction",
      tags: ["clean"],
      confidence: "high",
      partitions: [],
      riskLabels: []
    });

    expect(mocks.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "server-key" });
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.1-flash-lite-preview" }));
  });
});
