import { GoogleGenAI } from "@google/genai";
import { CrawlEvidence, ExtractedBrandSignals, GuidelineSet, JobRecord } from "@/types";
import { resolveGeminiModel } from "@/lib/gemini-models";
import { getServerGeminiApiKey, getServerGeminiModel } from "@/lib/server-env";

const SYSTEM_PROMPT = `You are a senior design-system writer. Given crawl-extracted design signals, produce concise synthesis only.

Respond ONLY with valid JSON matching this exact structure:

{
  "overview": "2-3 sentence summary of the interface tone and interaction language",
  "guidelines": {
    "dos": ["specific, high-signal guidance grounded in the supplied evidence"],
    "donts": ["specific pitfalls to avoid, grounded in the supplied evidence"]
  }
}

Rules:
- Do not invent tokens, measurements, or component libraries.
- Keep the overview concise and transportable into a DESIGN.md narrative.
- Guidelines must stay grounded in the evidence and avoid generic advice.`;

export interface GeminiSynthesis {
  overview: string;
  guidelines: GuidelineSet;
}

function buildCssSignalsSummary(evidence: CrawlEvidence): string {
  const allColors = evidence.pages.flatMap((p) => p.accentColors ?? []);
  const allBgColors = evidence.pages.flatMap((p) => p.backgroundColors ?? []);
  const allFonts = evidence.pages.flatMap((p) => p.fontFamilies ?? []);
  const allSizes = evidence.pages.flatMap((p) => p.fontSizes ?? []);
  const allWeights = evidence.pages.flatMap((p) => p.fontWeights ?? []);
  const allLineHeights = evidence.pages.flatMap((p) => p.lineHeights ?? []);
  const allLetterSpacings = evidence.pages.flatMap((p) => p.letterSpacings ?? []);
  const allRadii = evidence.pages.flatMap((p) => p.borderRadii ?? []);
  const allShadows = evidence.pages.flatMap((p) => p.boxShadows ?? []);
  const allSpacing = evidence.pages.flatMap((p) => p.spacingValues ?? []);
  const themeColor = evidence.pages.find((p) => p.themeColor)?.themeColor;

  const pages = evidence.pages.map((p) => ({
    url: p.url,
    title: p.title,
    headings: p.headings.slice(0, 5),
    description: p.description
  }));

  return JSON.stringify(
    {
      pages,
      themeColor,
      accentColors: [...new Set(allColors)].slice(0, 15),
      backgroundColors: [...new Set(allBgColors)].slice(0, 10),
      fontFamilies: [...new Set(allFonts)].slice(0, 6),
      fontSizes: [...new Set(allSizes)].slice(0, 12),
      fontWeights: [...new Set(allWeights)].slice(0, 8),
      lineHeights: [...new Set(allLineHeights)].slice(0, 8),
      letterSpacings: [...new Set(allLetterSpacings)].slice(0, 6),
      borderRadii: [...new Set(allRadii)].slice(0, 8),
      boxShadows: [...new Set(allShadows)].slice(0, 6),
      spacingValues: [...new Set(allSpacing)].slice(0, 12)
    },
    null,
    2
  );
}

function parseGeminiResponse(text: string): GeminiSynthesis {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  return {
    overview: parsed.overview ?? "",
    guidelines: {
      dos: parsed.guidelines?.dos ?? [],
      donts: parsed.guidelines?.donts ?? []
    }
  };
}

export async function generateWithGemini(job: JobRecord, extracted: ExtractedBrandSignals): Promise<GeminiSynthesis> {
  const apiKey = job.geminiApiKey ?? getServerGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is required for AI-powered synthesis.");
  }

  const model = resolveGeminiModel(job.geminiModel ?? getServerGeminiModel());
  const evidence = job.evidence ?? { pages: [], failures: [] };
  const domain = new URL(job.submittedUrl).hostname;
  const genAI = new GoogleGenAI({ apiKey });
  const cssSignals = buildCssSignalsSummary(evidence);

  const userPrompt = `Summarize the design system for ${domain} (${extracted.siteTitle}).

Here are the HTML- and crawl-derived design signals:

${cssSignals}

Return synthesis only: one concise narrative plus concrete dos/donts grounded in the evidence.`;

  const result = await genAI.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT
    }
  });

  const responseText = result.text?.trim();
  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseGeminiResponse(responseText);
}
