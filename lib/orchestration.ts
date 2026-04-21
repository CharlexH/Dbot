import { stylePresets } from "@/lib/mocks";
import { observeRepresentativePages } from "@/lib/browser-observation";
import { buildExportArtifacts } from "@/lib/exports";
import { deriveDesignSystemSections, deriveVisualDna } from "@/lib/design-system-inference";
import { resolveGeminiModel } from "@/lib/gemini-models";
import { getServerGeminiApiKey, getServerGeminiModel } from "@/lib/server-env";
import { generateWithGemini } from "@/lib/gemini";
import {
  BrowserObservedPage,
  CrawlEvidence,
  CrawledPageEvidence,
  EvidenceRef,
  EXPORT_TABS,
  ExportArtifact,
  ExtractedBrandSignals,
  GuidelineSet,
  IconSample,
  JobRecord,
  JOB_STAGES,
  JobStage,
  JobStageName,
  PaletteToken,
  PageRole,
  ProvenanceSource,
  ProvenancedValue,
  PartitionRecord,
  ResultCompatRecord,
  ResultRecord,
  RiskLabel,
  TypographyToken
} from "@/types";

const MAX_DISCOVER_PAGES = 3;
const MAX_HEADINGS = 3;
const MAX_SNIPPETS = 3;
const MAX_VISUAL_COLORS = 6;
const MAX_FONT_HINTS = 4;
const MAX_PROVENANCE_REFS = 3;
const MAX_BROWSER_OBSERVATION_PAGES = 3;
const MAX_ICON_SAMPLES = 8;

function getStage(job: JobRecord, stageName: JobStageName): JobStage {
  const stage = job.stages.find((item) => item.name === stageName);

  if (!stage) {
    throw new Error(`Unknown stage: ${stageName}`);
  }

  return stage;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(html: string): string {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function normalizeSvgMarkup(svg: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractSvgAttribute(svg: string, attribute: string): string | null {
  const match = svg.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? match[1] : null;
}

function parseSvgDimension(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseSvgViewBox(svg: string): { width: number; height: number } | null {
  const viewBox = extractSvgAttribute(svg, "viewBox");
  if (!viewBox) return null;

  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((token) => Number(token))
    .filter((token) => !Number.isNaN(token));

  if (parts.length !== 4) return null;
  return {
    width: parts[2],
    height: parts[3]
  };
}

function isLikelyIconSvg(svg: string): boolean {
  if (
    svg.length > 3000 ||
    /<(text|foreignObject|image|video)\b/i.test(svg) ||
    !/<(path|circle|rect|line|polyline|polygon|ellipse)\b/i.test(svg)
  ) {
    return false;
  }

  const width = parseSvgDimension(extractSvgAttribute(svg, "width"));
  const height = parseSvgDimension(extractSvgAttribute(svg, "height"));
  const viewBox = parseSvgViewBox(svg);
  const resolvedWidth = width ?? viewBox?.width ?? null;
  const resolvedHeight = height ?? viewBox?.height ?? null;

  if (resolvedWidth && resolvedWidth > 48) return false;
  if (resolvedHeight && resolvedHeight > 48) return false;

  return true;
}

function matchSingle(html: string, expression: RegExp): string | null {
  const match = expression.exec(html);
  return match ? cleanText(match[1]) : null;
}

function matchMany(html: string, expression: RegExp, limit: number): string[] {
  const matches: string[] = [];

  for (const match of html.matchAll(expression)) {
    const value = cleanText(match[1]);

    if (value && !matches.includes(value)) {
      matches.push(value);
    }

    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

function normalizeCssColor(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent" || trimmed === "currentColor") {
    return null;
  }

  const hex = normalizeHexColor(trimmed);
  if (hex) {
    return hex;
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i
  );

  if (!rgbaMatch) {
    return null;
  }

  const alpha = rgbaMatch[4] ? Number.parseFloat(rgbaMatch[4]) : 1;
  if (!Number.isNaN(alpha) && alpha <= 0) {
    return null;
  }

  const channels = rgbaMatch.slice(1, 4).map((channel) => {
    const numeric = Number.parseInt(channel, 10);
    return Math.min(255, Math.max(0, numeric));
  });

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function inferPageRole(page: Pick<CrawledPageEvidence, "url" | "title">, index: number): PageRole {
  if (index === 0) {
    return "root";
  }

  const pathname = new URL(page.url).pathname.toLowerCase();
  const title = page.title.toLowerCase();
  const combined = `${pathname} ${title}`;

  if (combined.includes("docs") || combined.includes("help") || combined.includes("guide") || combined.includes("reference")) {
    return "docs";
  }

  if (combined.includes("app") || combined.includes("workspace") || combined.includes("dashboard")) {
    return "workspace";
  }

  if (combined.includes("pricing") || combined.includes("about") || combined.includes("feature") || combined.includes("marketing")) {
    return "marketing";
  }

  return "other";
}

function buildPageRef(page: Pick<CrawledPageEvidence, "url" | "title">, index: number, overrides?: Partial<EvidenceRef>): EvidenceRef {
  return {
    url: page.url,
    pageRole: inferPageRole(page, index),
    excerpt: overrides?.excerpt ?? page.title,
    selector: overrides?.selector,
  };
}

function buildHtmlRefs(
  pages: CrawledPageEvidence[],
  selector?: (page: CrawledPageEvidence, index: number) => Partial<EvidenceRef> | null
): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  for (const [index, page] of pages.entries()) {
    const overrides = selector ? selector(page, index) : null;
    refs.push(buildPageRef(page, index, overrides ?? undefined));

    if (refs.length >= MAX_PROVENANCE_REFS) {
      break;
    }
  }

  return refs;
}

function buildBrowserPageRefs(browserPages: BrowserObservedPage[]): EvidenceRef[] {
  return browserPages.slice(0, MAX_PROVENANCE_REFS).map((page) => ({
    url: page.finalUrl || page.url,
    pageRole: page.pageRole,
    excerpt: page.title
  }));
}

function buildBrowserTypographyRefs(browserPages: BrowserObservedPage[]): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  for (const page of browserPages) {
    for (const sample of page.typography) {
      refs.push({
        url: page.finalUrl || page.url,
        pageRole: page.pageRole,
        selector: sample.selector,
        excerpt: sample.excerpt
      });

      if (refs.length >= MAX_PROVENANCE_REFS) {
        return refs;
      }
    }
  }

  return refs.length > 0 ? refs : buildBrowserPageRefs(browserPages);
}

function buildBrowserSurfaceRefs(browserPages: BrowserObservedPage[]): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  for (const page of browserPages) {
    for (const surface of page.surfaces) {
      refs.push({
        url: page.finalUrl || page.url,
        pageRole: page.pageRole,
        selector: surface.selector,
        excerpt: surface.excerpt
      });

      if (refs.length >= MAX_PROVENANCE_REFS) {
        return refs;
      }
    }
  }

  return refs.length > 0 ? refs : buildBrowserPageRefs(browserPages);
}

function buildProvenancedValue<T>(
  kind: ProvenancedValue<T>["kind"],
  source: ProvenanceSource,
  value: T,
  refs: EvidenceRef[],
  fallbackReason?: string
): ProvenancedValue<T> {
  return {
    kind,
    source,
    value,
    refs,
    fallbackReason
  };
}

function getThemeColor(html: string): string | null {
  const raw =
    matchSingle(html, /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i) ??
    matchSingle(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);

  return raw ? normalizeHexColor(raw) : null;
}

function getAccentColors(html: string): string[] {
  const colors: string[] = [];

  for (const match of html.matchAll(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const normalized = normalizeHexColor(match[0]);

    if (normalized && !colors.includes(normalized)) {
      colors.push(normalized);
    }

    if (colors.length >= MAX_VISUAL_COLORS) {
      break;
    }
  }

  return colors;
}

function getFontFamilies(html: string): string[] {
  const declarations: string[] = [];

  for (const match of html.matchAll(/font-family\s*:\s*([^;}{]+)[;}]?/gi)) {
    const normalized = cleanText(
      match[1]
        .split(",")
        .map((token) => token.trim().replace(/^['"]|['"]$/g, ""))
        .join(", ")
    );

    if (normalized && !declarations.includes(normalized)) {
      declarations.push(normalized);
    }

    if (declarations.length >= MAX_FONT_HINTS) {
      break;
    }
  }

  return declarations;
}

function getCssValues(html: string, property: string, limit: number): string[] {
  const values: string[] = [];
  const regex = new RegExp(`${property}\\s*:\\s*([^;}{]+)[;}]`, "gi");

  for (const match of html.matchAll(regex)) {
    const value = cleanText(match[1]);
    if (value && !values.includes(value)) {
      values.push(value);
    }
    if (values.length >= limit) break;
  }

  return values;
}

function getFontSizes(html: string): string[] {
  return getCssValues(html, "font-size", 10);
}

function getFontWeights(html: string): string[] {
  return getCssValues(html, "font-weight", 6);
}

function getLetterSpacings(html: string): string[] {
  return getCssValues(html, "letter-spacing", 6);
}

function getLineHeights(html: string): string[] {
  return getCssValues(html, "line-height", 6);
}

function getBorderRadii(html: string): string[] {
  return getCssValues(html, "border-radius", 8);
}

function getBoxShadows(html: string): string[] {
  const shadows: string[] = [];
  for (const match of html.matchAll(/box-shadow\s*:\s*([^;}{]+)[;}]/gi)) {
    const value = cleanText(match[1]);
    if (value && value !== "none" && !shadows.includes(value)) {
      shadows.push(value);
    }
    if (shadows.length >= 6) break;
  }
  return shadows;
}

function getSpacingValues(html: string): string[] {
  const values: string[] = [];
  const props = ["padding", "margin", "gap", "padding-top", "padding-bottom", "padding-left", "padding-right", "margin-top", "margin-bottom"];
  for (const prop of props) {
    for (const v of getCssValues(html, prop, 4)) {
      const parts = v.split(/\s+/);
      for (const part of parts) {
        if (/^\d+(\.\d+)?(px|rem|em)$/.test(part) && !values.includes(part)) {
          values.push(part);
        }
        if (values.length >= 12) return values;
      }
    }
  }
  return values;
}

function getBackgroundColors(html: string): string[] {
  const colors: string[] = [];
  for (const match of html.matchAll(/background-color\s*:\s*([^;}{]+)[;}]/gi)) {
    const value = cleanText(match[1]);
    const hex = normalizeHexColor(value);
    if (hex && !colors.includes(hex)) {
      colors.push(hex);
    }
    if (colors.length >= MAX_VISUAL_COLORS) break;
  }
  return colors;
}

function getHtmlIconSamples(html: string): IconSample[] {
  const samples: IconSample[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
    const svg = normalizeSvgMarkup(match[0]);
    if (!svg || seen.has(svg) || !isLikelyIconSvg(svg)) {
      continue;
    }

    seen.add(svg);
    samples.push({
      label: `Icon ${samples.length + 1}`,
      svg,
      source: "crawl-html"
    });

    if (samples.length >= MAX_ICON_SAMPLES) {
      break;
    }
  }

  return samples;
}

function getTextSnippets(html: string): string[] {
  const snippets = matchMany(html, /<p[^>]*>([\s\S]*?)<\/p>/gi, MAX_SNIPPETS);

  if (snippets.length > 0) {
    return snippets;
  }

  const fallback = stripTags(html);
  return fallback ? [fallback.slice(0, 220)] : [];
}

function getSameOriginLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];

  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const resolved = new URL(match[1], base);

      if (!["http:", "https:"].includes(resolved.protocol)) {
        continue;
      }

      if (resolved.origin !== base.origin) {
        continue;
      }

      const normalized = resolved.pathname === "/" && !resolved.search ? resolved.origin : resolved.toString();

      if (normalized !== baseUrl && !links.includes(normalized)) {
        links.push(normalized);
      }

      if (links.length >= MAX_DISCOVER_PAGES - 1) {
        break;
      }
    } catch {
      continue;
    }
  }

  return links;
}

async function readHtmlPage(url: string, fetchImpl: typeof fetch): Promise<{ html: string; page: CrawledPageEvidence; links: string[] }> {
  const response = await fetchImpl(url, {
    headers: {
      accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    const challengeHeader = response.headers.get("cf-mitigated");
    const serverHeader = response.headers.get("server")?.toLowerCase() ?? "";

    if (response.status === 403 && (challengeHeader === "challenge" || serverHeader.includes("cloudflare"))) {
      throw new Error("Request blocked by anti-bot challenge (403)");
    }

    throw new Error(`Request failed with ${response.status}`);
  }

  const html = await response.text();
  const page: CrawledPageEvidence = {
    url,
    title: matchSingle(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? new URL(url).hostname,
    headings: matchMany(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, MAX_HEADINGS).map(stripTags),
    description:
      matchSingle(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      matchSingle(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i),
    textSnippets: getTextSnippets(html).map(stripTags),
    themeColor: getThemeColor(html),
    accentColors: getAccentColors(html),
    fontFamilies: getFontFamilies(html),
    fontSizes: getFontSizes(html),
    fontWeights: getFontWeights(html),
    letterSpacings: getLetterSpacings(html),
    lineHeights: getLineHeights(html),
    borderRadii: getBorderRadii(html),
    boxShadows: getBoxShadows(html),
    spacingValues: getSpacingValues(html),
    backgroundColors: getBackgroundColors(html),
    iconSamples: getHtmlIconSamples(html)
  };

  return {
    html,
    page,
    links: getSameOriginLinks(html, url)
  };
}

async function discoverEvidence(url: string, fetchImpl: typeof fetch, existingEvidence?: CrawlEvidence): Promise<CrawlEvidence> {
  if (existingEvidence && existingEvidence.pages.length > 0 && existingEvidence.failures.length > 0) {
    const pages = [...existingEvidence.pages];
    const failures: CrawlEvidence["failures"] = [];

    for (const failedPage of existingEvidence.failures) {
      try {
        const page = await readHtmlPage(failedPage.url, fetchImpl);
        if (!pages.some((item) => item.url === page.page.url)) {
          pages.push(page.page);
        }
      } catch (error) {
        failures.push({
          url: failedPage.url,
          reason: error instanceof Error ? error.message : "Unable to fetch page."
        });
      }
    }

    return { pages, failures };
  }

  const root = await readHtmlPage(url, fetchImpl);
  const pages: CrawledPageEvidence[] = [root.page];
  const failures: CrawlEvidence["failures"] = [];
  const queue = [...root.links];
  const seen = new Set([url, ...pages.map((page) => page.url)]);

  while (queue.length > 0 && pages.length < MAX_DISCOVER_PAGES + 1) {
    const link = queue.shift();

    if (!link || seen.has(link)) {
      continue;
    }

    seen.add(link);

    try {
      const page = await readHtmlPage(link, fetchImpl);
      pages.push(page.page);

      for (const nestedLink of page.links) {
        if (!seen.has(nestedLink) && !queue.includes(nestedLink)) {
          queue.push(nestedLink);
        }
      }
    } catch (error) {
      failures.push({
        url: link,
        reason: error instanceof Error ? error.message : "Unable to fetch page."
      });
    }
  }

  return { pages, failures };
}

function getConfidence(evidence: CrawlEvidence): PartitionRecord["confidence"] {
  if (evidence.pages.length >= 3 && evidence.failures.length === 0) {
    return "high";
  }

  if (evidence.pages.length >= 2) {
    return "medium";
  }

  return "low";
}

function inferPartitionTitle(page: CrawledPageEvidence, index: number): string {
  switch (inferPageRole(page, index)) {
    case "root":
      return "Primary experience";
    case "docs":
      return "Documentation";
    case "workspace":
      return "Workspace";
    case "marketing":
      return "Marketing";
    default:
      return `Same-domain surface ${index + 1}`;
  }
}

function buildRiskLabels(confidence: PartitionRecord["confidence"], evidence: CrawlEvidence): RiskLabel[] {
  const riskLabels: RiskLabel[] = [];

  if (confidence === "low") {
    riskLabels.push({
      label: "Low confidence",
      scope: "Partition appendix"
    });
  }

  if (evidence.failures.length > 0) {
    riskLabels.push({
      label: "Partial crawl coverage",
      scope: "Same-origin fetch coverage"
    });
  }

  return riskLabels;
}

function extractBrandSignals(job: JobRecord, evidence: CrawlEvidence): ExtractedBrandSignals {
  const rootPage = evidence.pages[0];
  const confidence = getConfidence(evidence);
  const riskLabels = buildRiskLabels(confidence, evidence);
  const categoryTag = job.selectedCategoryIds[0] ?? "website";
  const presetTag = job.selectedPresetIds[0] ?? "custom";
  const tags = Array.from(
    new Set([
      categoryTag.toLowerCase(),
      presetTag.toLowerCase(),
      confidence === "low" ? "low-confidence" : "evidence-backed"
    ])
  );
  const partitions = evidence.pages.map((page, index) => {
    const label = inferPartitionTitle(page, index);
    const pageRiskLabels = confidence === "low" && index > 0 ? [{ label: "Low confidence", scope: label }] : [];

    return {
      id: index === 0 ? "primary" : label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: label,
      rationale:
        index === 0
          ? "Primary landing and brand framing surface for the same-domain system."
          : "Same-origin page cluster retained in the partition appendix to avoid splitting DESIGN.md.",
      scopeSummary: [page.title, ...page.headings].filter(Boolean).slice(0, 3).join(" · ") || page.url,
      confidence,
      riskLabels: pageRiskLabels
    };
  });

  return {
    siteTitle: rootPage.title,
    vibe: `${categoryTag} product voice with ${confidence} evidence coverage.`,
    narrative:
      `Dbot synthesized one main ${rootPage.title} system from crawled same-origin evidence and preserved divergence in the partition appendix.`,
    tags,
    confidence,
    partitions,
    riskLabels
  };
}

function getColorLuminance(value: string): number {
  const normalized = normalizeHexColor(value);

  if (!normalized) {
    return 0;
  }

  const channels = normalized
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    return 0;
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function collectEvidenceColors(evidence: CrawlEvidence): string[] {
  const colors: string[] = [];

  for (const page of evidence.pages) {
    if (page.themeColor && !colors.includes(page.themeColor)) {
      colors.push(page.themeColor);
    }

    for (const color of page.accentColors ?? []) {
      if (!colors.includes(color)) {
        colors.push(color);
      }

      if (colors.length >= MAX_VISUAL_COLORS) {
        return colors;
      }
    }
  }

  return colors;
}

function collectBrowserColors(browserPages: BrowserObservedPage[]): string[] {
  const colors: string[] = [];

  for (const page of browserPages) {
    for (const value of Object.values(page.cssVariables)) {
      const normalized = normalizeCssColor(value);
      if (normalized && !colors.includes(normalized)) {
        colors.push(normalized);
      }
      if (colors.length >= MAX_VISUAL_COLORS) {
        return colors;
      }
    }

    for (const sample of page.typography) {
      const normalized = normalizeCssColor(sample.color);
      if (normalized && !colors.includes(normalized)) {
        colors.push(normalized);
      }
      if (colors.length >= MAX_VISUAL_COLORS) {
        return colors;
      }
    }

    for (const surface of page.surfaces) {
      for (const value of [surface.backgroundColor, surface.color, surface.borderColor]) {
        const normalized = normalizeCssColor(value);
        if (normalized && !colors.includes(normalized)) {
          colors.push(normalized);
        }
        if (colors.length >= MAX_VISUAL_COLORS) {
          return colors;
        }
      }
    }
  }

  return colors;
}

function buildPalette(job: JobRecord, evidence: CrawlEvidence): PaletteToken[] {
  const preset = stylePresets.find((item) => item.id === job.selectedPresetIds[0]);
  const fallbackColors = preset?.palette ?? ["#191C1F", "#505A63", "#FFFFFF"];
  const evidenceColors = collectEvidenceColors(evidence);
  const darkColor = evidenceColors.find((color) => getColorLuminance(color) < 0.25) ?? fallbackColors[0];
  const lightColor = evidenceColors.find((color) => getColorLuminance(color) > 0.9) ?? fallbackColors[2] ?? "#FFFFFF";
  const accentColor = evidence.pages.find((page) => page.themeColor)?.themeColor ?? evidenceColors[0] ?? fallbackColors[1] ?? "#89C6FF";
  const supportColor =
    evidenceColors.find((color) => ![darkColor, lightColor, accentColor].includes(color)) ??
    fallbackColors.find((color) => ![darkColor, lightColor, accentColor].includes(color)) ??
    fallbackColors[1] ??
    darkColor;

  return [
    { name: "Primary Ink", value: darkColor, role: "Primary text and interface chrome" },
    { name: "Support Tone", value: supportColor, role: "Secondary text and framing" },
    { name: "Canvas", value: lightColor, role: "Base canvas and cards" },
    { name: "Signal Accent", value: accentColor, role: "Accent and focus affordances" }
  ];
}

function collectFontFamilies(evidence: CrawlEvidence): string[] {
  const fontFamilies: string[] = [];

  for (const page of evidence.pages) {
    for (const family of page.fontFamilies ?? []) {
      if (!fontFamilies.includes(family)) {
        fontFamilies.push(family);
      }

      if (fontFamilies.length >= MAX_FONT_HINTS) {
        return fontFamilies;
      }
    }
  }

  return fontFamilies;
}

function collectBrowserFontFamilies(browserPages: BrowserObservedPage[]): string[] {
  const fontFamilies: string[] = [];

  for (const page of browserPages) {
    for (const sample of page.typography) {
      if (sample.family && !fontFamilies.includes(sample.family)) {
        fontFamilies.push(sample.family);
      }

      if (fontFamilies.length >= MAX_FONT_HINTS) {
        return fontFamilies;
      }
    }
  }

  return fontFamilies;
}

function collectBrowserTypographySamples(browserPages: BrowserObservedPage[]) {
  return browserPages.flatMap((page) => page.typography);
}

function collectBrowserSpacingValues(browserPages: BrowserObservedPage[]): string[] {
  const values: string[] = [];

  for (const page of browserPages) {
    for (const surface of page.surfaces) {
      const parts = (surface.padding ?? "").split(/\s+/).map((part) => part.trim()).filter(Boolean);

      for (const part of parts) {
        if (/^\d+(\.\d+)?px$/i.test(part) && !values.includes(part) && Number.parseFloat(part) > 0) {
          values.push(part);
        }
      }
    }
  }

  return values;
}

function collectBrowserShadows(browserPages: BrowserObservedPage[]): string[] {
  return dedupe(
    browserPages
      .flatMap((page) => page.surfaces.map((surface) => surface.boxShadow))
      .filter((shadow): shadow is string => Boolean(shadow && shadow !== "none"))
  );
}

function collectBrowserBorderRadii(browserPages: BrowserObservedPage[]): string[] {
  return dedupe(
    browserPages
      .flatMap((page) => page.surfaces.map((surface) => surface.borderRadius))
      .filter((radius): radius is string => Boolean(radius && radius !== "0px"))
  ).sort((left, right) => parseFloat(left) - parseFloat(right));
}

function collectObservedIconSamples(evidence: CrawlEvidence, browserPages: BrowserObservedPage[]): IconSample[] {
  const samples: IconSample[] = [];
  const seen = new Set<string>();

  for (const sample of browserPages.flatMap((page) => page.icons ?? [])) {
    if (seen.has(sample.svg)) continue;
    seen.add(sample.svg);
    samples.push({
      label: sample.label,
      svg: sample.svg,
      source: "crawl-browser"
    });
    if (samples.length >= MAX_ICON_SAMPLES) {
      return samples;
    }
  }

  for (const sample of evidence.pages.flatMap((page) => page.iconSamples ?? [])) {
    if (seen.has(sample.svg)) continue;
    seen.add(sample.svg);
    samples.push(sample);
    if (samples.length >= MAX_ICON_SAMPLES) {
      return samples;
    }
  }

  return samples;
}

function buildTypography(job: JobRecord, title: string, evidence: CrawlEvidence): TypographyToken[] {
  const category = (job.selectedCategoryIds[0] ?? "Product").toLowerCase();
  const fontFamilies = collectFontFamilies(evidence);

  // Collect aggregated CSS signals across pages
  const allSizes = evidence.pages.flatMap((p) => p.fontSizes ?? []);
  const allWeights = evidence.pages.flatMap((p) => p.fontWeights ?? []);
  const allLineHeights = evidence.pages.flatMap((p) => p.lineHeights ?? []);
  const allLetterSpacings = evidence.pages.flatMap((p) => p.letterSpacings ?? []);

  // Find the largest font-size for display, smallest common for body
  const numericSizes = allSizes
    .map((s) => ({ raw: s, px: parseFloat(s) }))
    .filter((v) => !isNaN(v.px))
    .sort((a, b) => b.px - a.px);

  const displaySize = numericSizes[0]?.raw;
  const bodySize = numericSizes.find((s) => s.px >= 14 && s.px <= 18)?.raw ?? numericSizes[numericSizes.length - 1]?.raw;

  // Find heaviest weight for display, lighter for body
  const numericWeights = allWeights
    .map((w) => parseFloat(w))
    .filter((v) => !isNaN(v))
    .sort((a, b) => b - a);

  const displayWeight = numericWeights[0]?.toString();
  const bodyWeight = numericWeights.find((w) => w >= 300 && w <= 500)?.toString() ?? "400";

  const displayFamily =
    fontFamilies.find((family) => {
      const lower = family.toLowerCase();
      return lower.includes("serif") && !lower.includes("sans-serif");
    }) ??
    fontFamilies.find((family) => !family.toLowerCase().includes("sans")) ??
    (category.includes("dark") ? "ui-sans-serif, system-ui" : "ui-serif, Georgia");
  const bodyFamily =
    fontFamilies.find((family) => family.toLowerCase().includes("sans") || family.toLowerCase().includes("system-ui")) ??
    fontFamilies[0] ??
    "ui-sans-serif, system-ui";

  return [
    {
      name: "Display",
      family: displayFamily,
      weight: displayWeight,
      size: displaySize,
      lineHeight: allLineHeights[0],
      letterSpacing: allLetterSpacings.find((ls) => ls.includes("-") || ls.includes("em")) ?? allLetterSpacings[0],
      usage: "Hero statements and section framing",
      sample: title
    },
    {
      name: "Body",
      family: bodyFamily,
      weight: bodyWeight,
      size: bodySize,
      lineHeight: allLineHeights.find((lh) => {
        const n = parseFloat(lh);
        return !isNaN(n) && n >= 1.3 && n <= 2;
      }) ?? allLineHeights[1],
      letterSpacing: undefined,
      usage: "Operational copy and evidence summaries",
      sample: "Evidence-backed interface guidance"
    }
  ];
}

function buildPaletteFromColors(job: JobRecord, colors: string[]): PaletteToken[] {
  const preset = stylePresets.find((item) => item.id === job.selectedPresetIds[0]);
  const fallbackColors = preset?.palette ?? ["#191C1F", "#505A63", "#FFFFFF"];
  const darkColor = colors.find((color) => getColorLuminance(color) < 0.25) ?? fallbackColors[0];
  const lightColor = colors.find((color) => getColorLuminance(color) > 0.9) ?? fallbackColors[2] ?? "#FFFFFF";
  const accentColor = colors[0] ?? fallbackColors[1] ?? "#89C6FF";
  const supportColor =
    colors.find((color) => ![darkColor, lightColor, accentColor].includes(color)) ??
    fallbackColors.find((color) => ![darkColor, lightColor, accentColor].includes(color)) ??
    fallbackColors[1] ??
    darkColor;

  return [
    { name: "Primary Ink", value: darkColor, role: "Primary text and interface chrome" },
    { name: "Support Tone", value: supportColor, role: "Secondary text and framing" },
    { name: "Canvas", value: lightColor, role: "Base canvas and cards" },
    { name: "Signal Accent", value: accentColor, role: "Accent and focus affordances" }
  ];
}

function buildTypographyFromBrowser(job: JobRecord, title: string, browserPages: BrowserObservedPage[]): TypographyToken[] {
  const category = (job.selectedCategoryIds[0] ?? "Product").toLowerCase();
  const fontFamilies = collectBrowserFontFamilies(browserPages);
  const samples = collectBrowserTypographySamples(browserPages);
  const headings = samples.filter((sample) => sample.role === "heading");
  const bodies = samples.filter((sample) => sample.role === "body");

  const display = headings[0] ?? samples[0];
  const body = bodies[0] ?? samples.find((sample) => sample.role === "label") ?? display;

  const displayFamily =
    display?.family ??
    fontFamilies.find((family) => {
      const lower = family.toLowerCase();
      return lower.includes("serif") && !lower.includes("sans-serif");
    }) ??
    fontFamilies.find((family) => !family.toLowerCase().includes("sans")) ??
    (category.includes("dark") ? "ui-sans-serif, system-ui" : "ui-serif, Georgia");
  const bodyFamily =
    body?.family ??
    fontFamilies.find((family) => family.toLowerCase().includes("sans") || family.toLowerCase().includes("system-ui")) ??
    fontFamilies[0] ??
    "ui-sans-serif, system-ui";

  return [
    {
      name: "Display",
      family: displayFamily,
      weight: display?.weight,
      size: display?.size,
      lineHeight: display?.lineHeight,
      letterSpacing: display?.letterSpacing,
      usage: "Hero statements and section framing",
      sample: display?.excerpt ?? title
    },
    {
      name: "Body",
      family: bodyFamily,
      weight: body?.weight ?? "400",
      size: body?.size,
      lineHeight: body?.lineHeight,
      letterSpacing: body?.letterSpacing,
      usage: "Operational copy and evidence summaries",
      sample: body?.excerpt ?? "Evidence-backed interface guidance"
    }
  ];
}

function inferComponentPreviewLabel(page: CrawledPageEvidence, index: number): string {
  if (index === 0) {
    return "Hero framing";
  }

  const signals = [new URL(page.url).pathname, page.title, ...page.headings].join(" ").toLowerCase();

  if (signals.includes("docs") || signals.includes("guide") || signals.includes("reference")) {
    return "Documentation entry";
  }

  if (signals.includes("app") || signals.includes("workspace") || signals.includes("dashboard")) {
    return "Workspace shell";
  }

  if (signals.includes("pricing") || signals.includes("feature") || signals.includes("about")) {
    return "Marketing CTA";
  }

  return `Surface ${index + 1}`;
}

function buildComponentPreviews(evidence: CrawlEvidence): ResultRecord["componentPreviews"] {
  return evidence.pages.slice(0, 3).map((page, index) => ({
    label: inferComponentPreviewLabel(page, index),
    detail: page.headings[0] ?? page.description ?? page.textSnippets[0] ?? page.title
  }));
}

function buildGuidelines(job: JobRecord, extracted: ExtractedBrandSignals, evidence: CrawlEvidence): GuidelineSet {
  const category = job.selectedCategoryIds[0] ?? "product";
  const borderRadii = evidence.pages.flatMap((p) => p.borderRadii ?? []);
  const hasSmallRadius = borderRadii.some((r) => { const n = parseFloat(r); return !isNaN(n) && n <= 6; });
  const hasDarkBg = evidence.pages.some((p) => (p.backgroundColors ?? []).some((c) => getColorLuminance(c) < 0.15));
  const siteName = evidence.pages[0]?.title ?? "the root page";

  const dos: string[] = [
    `Maintain the ${hasDarkBg ? "dark-mode" : "light-mode"} palette as the primary background strategy.`,
    `Keep typography tight and confident, matching the hierarchy found in ${siteName}.`,
    hasSmallRadius
      ? "Use small, consistent border-radius values for a precise, engineered feel."
      : "Use the established border-radius scale for consistent component rounding.",
    "Prefer thin borders and subtle dividers over heavy shadows for content separation.",
    `Use the accent color sparingly for focus states and primary call-to-action elements.`
  ];

  const donts: string[] = [
    hasDarkBg
      ? "Do not introduce bright backgrounds or saturated gradients that break the dark-mode restraint."
      : "Do not mix dark-mode sections into the predominantly light interface.",
    "Do not use overly decorative or playful type treatments that conflict with the product tone.",
    "Do not rely on heavy drop shadows or dramatic elevation to separate content.",
    extracted.confidence === "high"
      ? "Do not introduce design patterns not supported by crawled evidence."
      : "Do not over-claim consistency when evidence coverage is thin.",
    "Do not use pure white for large text areas; prefer the off-white/gray tones from the palette."
  ];

  return { dos, donts };
}

function buildSpacingTokens(values: string[]): import("@/types").SpacingToken[] {
  const pxValues = values
    .map((v) => ({ raw: v, px: parseFloat(v) }))
    .filter((v) => !isNaN(v.px) && v.px > 0)
    .sort((a, b) => a.px - b.px);

  // Deduplicate and pick representative scale
  const seen = new Set<number>();
  const unique = pxValues.filter((v) => {
    if (seen.has(v.px)) return false;
    seen.add(v.px);
    return true;
  });

  const names = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
  return unique.slice(0, names.length).map((v, i) => ({
    name: names[i],
    value: v.raw
  }));
}

function buildSpacing(evidence: CrawlEvidence): import("@/types").SpacingToken[] {
  return buildSpacingTokens(evidence.pages.flatMap((page) => page.spacingValues ?? []));
}

function buildShadowTokens(values: string[]): import("@/types").ShadowToken[] {
  const unique = Array.from(new Set(values));
  const names = ["sm", "md", "lg", "xl", "inner"];
  return unique.slice(0, names.length).map((v, i) => ({
    name: names[i],
    value: v
  }));
}

function buildShadows(evidence: CrawlEvidence): import("@/types").ShadowToken[] {
  return buildShadowTokens(evidence.pages.flatMap((page) => page.boxShadows ?? []));
}

function collectBorderRadiusValues(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => parseFloat(a) - parseFloat(b)).slice(0, 6);
}

function collectBorderRadii(evidence: CrawlEvidence): string[] {
  return collectBorderRadiusValues(evidence.pages.flatMap((page) => page.borderRadii ?? []));
}

function selectRepresentativeObservationTargets(evidence: CrawlEvidence) {
  const targets: Array<{ url: string; title: string; pageRole: PageRole }> = [];
  const seen = new Set<string>();

  const pushTarget = (page: CrawledPageEvidence, index: number) => {
    if (seen.has(page.url) || targets.length >= MAX_BROWSER_OBSERVATION_PAGES) {
      return;
    }

    seen.add(page.url);
    targets.push({
      url: page.url,
      title: page.title,
      pageRole: inferPageRole(page, index)
    });
  };

  if (evidence.pages[0]) {
    pushTarget(evidence.pages[0], 0);
  }

  const priorities: PageRole[] = ["workspace", "docs", "marketing", "other"];
  for (const role of priorities) {
    const match = evidence.pages.find((page, index) => index > 0 && inferPageRole(page, index) === role);
    if (match) {
      pushTarget(match, evidence.pages.indexOf(match));
    }
  }

  for (const [index, page] of evidence.pages.entries()) {
    pushTarget(page, index);
  }

  return targets.slice(0, MAX_BROWSER_OBSERVATION_PAGES);
}

function buildObservedSnapshot(
  job: JobRecord,
  extracted: ExtractedBrandSignals,
  evidence: CrawlEvidence,
  browserPages: BrowserObservedPage[]
): ResultRecord["observed"] {
  const browserColors = collectBrowserColors(browserPages);
  const htmlColors = collectEvidenceColors(evidence);
  const paletteSource: ProvenanceSource =
    browserColors.length > 0 ? "crawl-browser" : htmlColors.length > 0 ? "crawl-html" : "derived-rule";
  const palette = paletteSource === "crawl-browser" ? buildPaletteFromColors(job, browserColors) : buildPalette(job, evidence);

  const browserTypographySamples = collectBrowserTypographySamples(browserPages);
  const htmlHasTypographySignals =
    collectFontFamilies(evidence).length > 0 ||
    evidence.pages.some(
      (page) =>
        (page.fontSizes?.length ?? 0) > 0 ||
        (page.fontWeights?.length ?? 0) > 0 ||
        (page.lineHeights?.length ?? 0) > 0
    );
  const typographySource: ProvenanceSource =
    browserTypographySamples.length > 0 ? "crawl-browser" : htmlHasTypographySignals ? "crawl-html" : "derived-rule";
  const typography =
    typographySource === "crawl-browser"
      ? buildTypographyFromBrowser(job, extracted.siteTitle, browserPages)
      : buildTypography(job, extracted.siteTitle, evidence);

  const browserSpacingValues = collectBrowserSpacingValues(browserPages);
  const htmlSpacingValues = evidence.pages.flatMap((page) => page.spacingValues ?? []);
  const spacingSource: ProvenanceSource =
    browserSpacingValues.length > 0 ? "crawl-browser" : htmlSpacingValues.length > 0 ? "crawl-html" : "derived-rule";
  const spacing =
    spacingSource === "crawl-browser" ? buildSpacingTokens(browserSpacingValues) : buildSpacing(evidence);

  const browserShadowValues = collectBrowserShadows(browserPages);
  const htmlShadowValues = evidence.pages.flatMap((page) => page.boxShadows ?? []);
  const shadowSource: ProvenanceSource =
    browserShadowValues.length > 0 ? "crawl-browser" : htmlShadowValues.length > 0 ? "crawl-html" : "derived-rule";
  const shadows =
    shadowSource === "crawl-browser" ? buildShadowTokens(browserShadowValues) : buildShadows(evidence);

  const browserBorderRadii = collectBrowserBorderRadii(browserPages);
  const htmlBorderRadii = evidence.pages.flatMap((page) => page.borderRadii ?? []);
  const borderRadiusSource: ProvenanceSource =
    browserBorderRadii.length > 0 ? "crawl-browser" : htmlBorderRadii.length > 0 ? "crawl-html" : "derived-rule";
  const borderRadii =
    borderRadiusSource === "crawl-browser"
      ? collectBorderRadiusValues(browserBorderRadii)
      : collectBorderRadii(evidence);

  return {
    evidence: {
      htmlPages: evidence.pages,
      browserPages
    },
    palette: buildProvenancedValue(
      "observed",
      paletteSource,
      palette,
      paletteSource === "crawl-browser" ? buildBrowserPageRefs(browserPages) : buildHtmlRefs(evidence.pages),
      paletteSource === "derived-rule" ? "No direct color tokens were observed; preset fallback filled the palette scaffold." : undefined
    ),
    typography: buildProvenancedValue(
      "observed",
      typographySource,
      typography,
      typographySource === "crawl-browser" ? buildBrowserTypographyRefs(browserPages) : buildHtmlRefs(evidence.pages),
      typographySource === "derived-rule" ? "No direct typographic signals were observed; category fallback filled the baseline hierarchy." : undefined
    ),
    spacing: buildProvenancedValue(
      "observed",
      spacingSource,
      spacing,
      spacingSource === "crawl-browser" ? buildBrowserSurfaceRefs(browserPages) : buildHtmlRefs(evidence.pages),
      spacingSource === "derived-rule" ? "No direct spacing values were observed; the scale remains a heuristic fallback." : undefined
    ),
    shadows: buildProvenancedValue(
      "observed",
      shadowSource,
      shadows,
      shadowSource === "crawl-browser" ? buildBrowserSurfaceRefs(browserPages) : buildHtmlRefs(evidence.pages),
      shadowSource === "derived-rule" ? "No direct shadow treatment was observed in the sampled pages." : undefined
    ),
    borderRadii: buildProvenancedValue(
      "observed",
      borderRadiusSource,
      borderRadii,
      borderRadiusSource === "crawl-browser" ? buildBrowserSurfaceRefs(browserPages) : buildHtmlRefs(evidence.pages),
      borderRadiusSource === "derived-rule" ? "No direct radius treatment was observed in the sampled pages." : undefined
    )
  };
}

function buildLocalSynthesis(
  job: JobRecord,
  extracted: ExtractedBrandSignals,
  evidence: CrawlEvidence,
  refs: EvidenceRef[]
): ResultRecord["synthesis"] {
  return {
    narrative: buildProvenancedValue("synthesized", "derived-rule", extracted.narrative, refs),
    guidelines: buildProvenancedValue(
      "synthesized",
      "derived-rule",
      buildGuidelines(job, extracted, evidence),
      refs
    )
  };
}

function buildFinalSynthesis(
  fallback: ResultRecord["synthesis"],
  geminiSynthesis: Awaited<ReturnType<typeof generateWithGemini>> | null,
  refs: EvidenceRef[]
): ResultRecord["synthesis"] {
  if (!geminiSynthesis) {
    return fallback;
  }

  const overview = geminiSynthesis.overview.trim();
  const hasGuidelineContent =
    geminiSynthesis.guidelines.dos.length > 0 || geminiSynthesis.guidelines.donts.length > 0;

  return {
    narrative: overview
      ? buildProvenancedValue("synthesized", "gemini", overview, refs)
      : fallback.narrative,
    guidelines: hasGuidelineContent
      ? buildProvenancedValue("synthesized", "gemini", geminiSynthesis.guidelines, refs)
      : fallback.guidelines
  };
}

function buildCompatRecord(args: {
  site: ResultCompatRecord["site"];
  brand: ResultRecord["derived"]["brand"];
  observed: ResultRecord["observed"];
  componentLanguage: ResultRecord["derived"]["componentLanguage"];
  sections: ResultRecord["derived"]["sections"];
  synthesis: ResultRecord["synthesis"];
  partitions: ResultRecord["derived"]["partitions"];
  riskLabels: ResultRecord["derived"]["riskLabels"];
  provenanceWarnings: string[];
  exports?: ExportArtifact[];
}): ResultCompatRecord {
  return {
    site: args.site,
    brandSummary: {
      title: args.brand.value.title,
      vibe: args.brand.value.vibe,
      narrative: args.synthesis.narrative.value,
      tags: args.brand.value.tags,
      sourceUrl: args.brand.value.sourceUrl
    },
    palette: args.observed.palette.value,
    typography: args.observed.typography.value,
    spacing: args.observed.spacing.value,
    shadows: args.observed.shadows.value,
    borderRadii: args.observed.borderRadii.value,
    iconSamples: collectObservedIconSamples(
      { pages: args.observed.evidence.htmlPages, failures: [] },
      args.observed.evidence.browserPages
    ),
    derivedDesignSystem: {
      sections: args.sections.value
    },
    componentPreviews: args.componentLanguage.value,
    guidelines: args.synthesis.guidelines.value,
    exports: args.exports ?? [],
    partitions: args.partitions.value,
    riskLabels: args.riskLabels.value,
    provenanceWarnings: args.provenanceWarnings,
    includesPartitionAppendix: true
  };
}

function buildResult(args: {
  job: JobRecord;
  extracted: ExtractedBrandSignals;
  browserPages?: BrowserObservedPage[];
  provenanceWarnings?: string[];
  geminiSynthesis?: Awaited<ReturnType<typeof generateWithGemini>> | null;
}): ResultRecord {
  const { job, extracted } = args;
  const evidence = job.evidence ?? { pages: [], failures: [] };
  const browserPages = args.browserPages ?? [];
  const provenanceWarnings = args.provenanceWarnings ?? [];
  const observed = buildObservedSnapshot(job, extracted, evidence, browserPages);
  const sharedRefs =
    browserPages.length > 0
      ? dedupe([...buildBrowserPageRefs(browserPages), ...buildHtmlRefs(evidence.pages)]).slice(0, MAX_PROVENANCE_REFS)
      : buildHtmlRefs(evidence.pages);
  const componentLanguage = buildProvenancedValue(
    "derived",
    "derived-rule",
    buildComponentPreviews(evidence),
    buildHtmlRefs(evidence.pages, (page, index) => ({
      excerpt: page.headings[0] ?? page.description ?? page.textSnippets[0] ?? page.title,
      selector: index === 0 ? "h1, h2, h3" : undefined
    }))
  );
  const brand = buildProvenancedValue(
    "derived",
    "derived-rule",
    {
      title: browserPages[0]?.title || extracted.siteTitle,
      vibe: extracted.vibe,
      tags: extracted.tags,
      sourceUrl: browserPages[0]?.finalUrl || job.submittedUrl
    },
    sharedRefs
  );
  const partitions = buildProvenancedValue("derived", "derived-rule", extracted.partitions, buildHtmlRefs(evidence.pages));
  const riskLabels = buildProvenancedValue("derived", "derived-rule", extracted.riskLabels, buildHtmlRefs(evidence.pages));
  const localSynthesis = buildLocalSynthesis(job, extracted, evidence, sharedRefs);

  const provisionalSite = {
    canonicalUrl: browserPages[0]?.finalUrl || job.submittedUrl,
    domain: new URL(browserPages[0]?.finalUrl || job.submittedUrl).hostname,
    title: browserPages[0]?.title || extracted.siteTitle
  };

  const provisionalSections = buildProvenancedValue(
    "derived",
    "derived-rule",
    [] as ResultRecord["derived"]["sections"]["value"],
    sharedRefs
  );

  const compatForSections = buildCompatRecord({
    site: provisionalSite,
    brand,
    observed,
    componentLanguage,
    sections: provisionalSections,
    synthesis: localSynthesis,
    partitions,
    riskLabels,
    provenanceWarnings
  });

  const sections = buildProvenancedValue(
    "derived",
    "derived-rule",
    deriveDesignSystemSections(compatForSections).sections,
    sharedRefs
  );

  const compatForVisualDna = buildCompatRecord({
    site: provisionalSite,
    brand,
    observed,
    componentLanguage,
    sections,
    synthesis: localSynthesis,
    partitions,
    riskLabels,
    provenanceWarnings
  });

  const derived = {
    brand,
    visualDna: buildProvenancedValue("derived", "derived-rule", deriveVisualDna(compatForVisualDna), sharedRefs),
    componentLanguage,
    sections,
    partitions,
    riskLabels
  } satisfies ResultRecord["derived"];

  const synthesis = buildFinalSynthesis(localSynthesis, args.geminiSynthesis ?? null, sharedRefs);
  const compat = buildCompatRecord({
    site: provisionalSite,
    brand,
    observed,
    componentLanguage,
    sections,
    synthesis,
    partitions,
    riskLabels,
    provenanceWarnings
  });

  const baseResult: ResultRecord = {
    provenanceVersion: 1,
    observed,
    derived,
    synthesis,
    compat,
    ...compat
  };

  const exports = buildExportArtifacts({
    result: baseResult,
    meta: {
      confidence: extracted.confidence,
      pageCount: evidence.pages.length,
      failureCount: evidence.failures.length
    }
  });

  const finalCompat = {
    ...compat,
    exports
  };

  return {
    ...baseResult,
    ...finalCompat,
    compat: finalCompat,
    exports
  };
}

function validateResult(result: ResultRecord): ResultRecord {
  const exports: ExportArtifact[] = EXPORT_TABS.map(
    (tab): ExportArtifact => result.exports.find((artifact) => artifact.tab === tab) ?? { tab, status: "placeholder", content: "" }
  );

  return {
    ...result,
    exports,
    compat: {
      ...result.compat,
      exports
    },
    includesPartitionAppendix: true
  };
}

function startStage(job: JobRecord, stageName: JobStageName, nowIso: string): JobRecord {
  const stages: JobStage[] = job.stages.map(
    (stage): JobStage =>
      stage.name === stageName
        ? {
            ...stage,
            status: "running",
            startedAt: stage.startedAt ?? nowIso,
            message: stage.message ?? "Stage in progress.",
            error: null
          }
        : stage
  );

  return {
    ...job,
    status: "running",
    currentStage: stageName,
    updatedAt: nowIso,
    stages,
    failureStage: undefined,
    failureMessage: undefined
  };
}

function completeStage(job: JobRecord, stageName: JobStageName, nowIso: string, message: string): JobRecord {
  const currentIndex = JOB_STAGES.indexOf(stageName);
  const nextStage = JOB_STAGES[currentIndex + 1] ?? stageName;
  const completed = stageName === "Validate";
  const stages: JobStage[] = job.stages.map(
    (stage): JobStage =>
      stage.name === stageName
        ? {
            ...stage,
            status: "completed",
            endedAt: nowIso,
            message,
            error: null
          }
        : stage
  );

  return {
    ...job,
    status: completed ? "completed" : "running",
    currentStage: completed ? "Validate" : nextStage,
    updatedAt: nowIso,
    stages
  };
}

function failStage(job: JobRecord, stageName: JobStageName, nowIso: string, message: string): JobRecord {
  const stages: JobStage[] = job.stages.map(
    (stage): JobStage =>
      stage.name === stageName
        ? {
            ...stage,
            status: "failed",
            endedAt: nowIso,
            message: null,
            error: message
          }
        : stage
  );

  return {
    ...job,
    status: "failed",
    currentStage: stageName,
    updatedAt: nowIso,
    stages,
    failureStage: stageName,
    failureMessage: message,
    result: undefined
  };
}

function getNextStage(job: JobRecord): JobStageName | undefined {
  return job.stages.find((stage) => stage.status === "pending" || stage.status === "running")?.name;
}

export async function advanceJob(
  job: JobRecord,
  options?: {
    fetchImpl?: typeof fetch;
    observePages?: typeof observeRepresentativePages;
    nowIso?: string;
  }
): Promise<JobRecord> {
  if (job.status === "completed" || job.status === "failed") {
    return job;
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const observePages = options?.observePages ?? observeRepresentativePages;
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const stageName = getNextStage(job) ?? "Validate";
  const runningJob = startStage(job, stageName, nowIso);

  try {
    switch (stageName) {
      case "Discover": {
        const evidence = await discoverEvidence(job.submittedUrl, fetchImpl, runningJob.evidence);

        return completeStage(
          {
            ...runningJob,
            evidence
          },
          stageName,
          nowIso,
          `Collected ${evidence.pages.length} same-origin page${evidence.pages.length === 1 ? "" : "s"}.`
        );
      }
      case "Partition": {
        const evidence = runningJob.evidence;

        if (!evidence || evidence.pages.length === 0) {
          throw new Error("Partition requires discovered evidence.");
        }

        const extracted = extractBrandSignals(runningJob, evidence);

        return completeStage(
          {
            ...runningJob,
            extracted
          },
          stageName,
          nowIso,
          "Grouped same-domain evidence into one main system with a partition appendix."
        );
      }
      case "Extract": {
        const evidence = runningJob.evidence;

        if (!evidence || evidence.pages.length === 0) {
          throw new Error("Extract requires discovered evidence.");
        }

        const extracted = runningJob.extracted ?? extractBrandSignals(runningJob, evidence);

        return completeStage(
          {
            ...runningJob,
            extracted
          },
          stageName,
          nowIso,
          "Derived brand signals, confidence, and risk labels from crawled evidence."
        );
      }
      case "Generate": {
        const extracted = runningJob.extracted;

        if (!extracted) {
          throw new Error("Generate requires extracted signals.");
        }

        const geminiApiKey = runningJob.geminiApiKey ?? getServerGeminiApiKey();
        const geminiModel = resolveGeminiModel(runningJob.geminiModel ?? getServerGeminiModel());
        const useGemini = Boolean(geminiApiKey);
        const evidence = runningJob.evidence ?? { pages: [], failures: [] };
        const browserObservation = await observePages(selectRepresentativeObservationTargets(evidence));
        const geminiSynthesis = useGemini ? await generateWithGemini(runningJob, extracted) : null;
        const result = buildResult({
          job: runningJob,
          extracted,
          browserPages: browserObservation.pages,
          provenanceWarnings: browserObservation.warnings,
          geminiSynthesis
        });

        return completeStage(
          {
            ...runningJob,
            result
          },
          stageName,
          nowIso,
          useGemini
            ? `AI-powered synthesis completed with ${geminiModel}.`
            : "Assembled observed, derived, and synthesized layers from evidence-backed signals."
        );
      }
      case "Validate": {
        if (!runningJob.result) {
          throw new Error("Validate requires a generated result.");
        }

        return completeStage(
          {
            ...runningJob,
            result: validateResult(runningJob.result)
          },
          stageName,
          nowIso,
          "Verified export tabs, appendix policy, and final confidence labeling."
        );
      }
      default:
        return runningJob;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Job orchestration failed.";
    const message = stageName === "Discover" ? `Discover failed: ${reason}` : `${stageName} failed: ${reason}`;
    return failStage(runningJob, stageName, nowIso, message);
  }
}
