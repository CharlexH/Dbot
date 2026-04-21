import { EXPORT_TABS, ExportArtifact, ExtractedBrandSignals, ResultRecord } from "@/types";
import { getDerivedDesignSystem } from "@/lib/design-system-inference";

interface ExportMeta {
  confidence: ExtractedBrandSignals["confidence"];
  pageCount: number;
  failureCount: number;
}

interface BuildExportArtifactsArgs {
  result: ResultRecord;
  meta: ExportMeta;
}

function toSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatSourceLabel(source: string): string {
  switch (source) {
    case "crawl-browser":
      return "Browser";
    case "crawl-html":
      return "HTML";
    case "gemini":
      return "Gemini";
    case "derived-rule":
      return "Rule";
    default:
      return source;
  }
}

function formatRefs(result: ResultRecord, refs: ResultRecord["observed"]["palette"]["refs"]): string {
  if (refs.length === 0) {
    return `- Evidence: ${result.site.canonicalUrl}`;
  }

  return `- Evidence: ${refs
    .map((ref) => {
      const detail = ref.selector ? ` (${ref.selector})` : "";
      const excerpt = ref.excerpt ? ` — ${ref.excerpt}` : "";
      return `${ref.pageRole}: ${ref.url}${detail}${excerpt}`;
    })
    .join(" | ")}`;
}

function buildDesignMarkdown(result: ResultRecord): string {
  const observedSections = [
    "## Observed Facts",
    `- Site: ${result.site.title} (${result.site.domain})`,
    `- Palette source: ${formatSourceLabel(result.observed.palette.source)}`,
    formatRefs(result, result.observed.palette.refs),
    ...result.observed.palette.value.map((token) => `- Color ${token.name}: ${token.value} — ${token.role}`),
    `- Typography source: ${formatSourceLabel(result.observed.typography.source)}`,
    formatRefs(result, result.observed.typography.refs),
    ...result.observed.typography.value.map((token) => {
      const specs = [token.family, token.weight ? `weight ${token.weight}` : null, token.size, token.lineHeight ? `line-height ${token.lineHeight}` : null, token.letterSpacing ? `letter-spacing ${token.letterSpacing}` : null]
        .filter(Boolean)
        .join(", ");
      return `- Type ${token.name}: ${specs}. ${token.usage}`;
    }),
    `- Spacing source: ${formatSourceLabel(result.observed.spacing.source)}`,
    ...(
      result.observed.spacing.value.length > 0
        ? result.observed.spacing.value.map((token) => `- Spacing ${token.name}: ${token.value}`)
        : ["- Spacing: none directly observed"]
    ),
    `- Material source: ${formatSourceLabel(result.observed.shadows.source)} / ${formatSourceLabel(result.observed.borderRadii.source)}`,
    ...(
      result.observed.shadows.value.length > 0
        ? result.observed.shadows.value.map((token) => `- Shadow ${token.name}: \`${token.value}\``)
        : ["- Shadows: none directly observed"]
    ),
    ...(
      result.observed.borderRadii.value.length > 0
        ? result.observed.borderRadii.value.map((value) => `- Radius: ${value}`)
        : ["- Radii: none directly observed"]
    )
  ];

  const derivedSections = getDerivedDesignSystem(result).sections.flatMap((section) => [
    "",
    `### ${section.title}`,
    `- Source: ${formatSourceLabel(result.derived.sections.source)}`,
    `- Meta: ${section.meta}`,
    `- Summary: ${section.summary}`,
    ...section.metrics.map((metric) => `- ${metric.label}: ${metric.value}`),
    ...(section.groups ?? []).map((group) => `- ${group.label}: ${group.values.join(", ")}`),
    ...(section.tags && section.tags.length > 0 ? [`- Tags: ${section.tags.join(", ")}`] : []),
    ...(section.callout ? [`- ${section.callout.label}: ${section.callout.title}. ${section.callout.description}`] : [])
  ]);

  const partitionLines = result.partitions.length > 0
    ? result.partitions.map((partition) => `- ${partition.title}: ${partition.scopeSummary}`)
    : ["- No partitions available"];
  const riskLines = result.riskLabels.length > 0
    ? result.riskLabels.map((risk) => `- ${risk.label}: ${risk.scope}`)
    : ["- No crawl-derived risk labels"];
  const provenanceWarningLines = result.provenanceWarnings && result.provenanceWarnings.length > 0
    ? result.provenanceWarnings.map((warning) => `- ${warning}`)
    : ["- No provenance warnings"];

  return [
    "# DESIGN.md",
    "",
    ...observedSections,
    "",
    "## Derived Interpretation",
    `- Brand vibe: ${result.derived.brand.value.vibe}`,
    `- Source: ${formatSourceLabel(result.derived.brand.source)}`,
    `- Visual DNA meta: ${result.derived.visualDna.value.meta}`,
    ...result.derived.visualDna.value.metrics.map((metric) => `- ${metric.label}: ${metric.value}`),
    ...derivedSections,
    "",
    "## Synthesized Guidance",
    `- Narrative source: ${formatSourceLabel(result.synthesis.narrative.source)}`,
    `- Narrative: ${result.synthesis.narrative.value}`,
    "### Do",
    ...result.synthesis.guidelines.value.dos.map((item) => `- ${item}`),
    "### Don't",
    ...result.synthesis.guidelines.value.donts.map((item) => `- ${item}`),
    "",
    "## Partition Appendix",
    ...partitionLines,
    "",
    "## Risks",
    ...riskLines,
    ...provenanceWarningLines
  ].join("\n");
}

function buildDesignJson(result: ResultRecord, meta: ExportMeta): string {
  return JSON.stringify(
    {
      meta: {
        confidence: meta.confidence,
        evidence: {
          pageCount: meta.pageCount,
          failureCount: meta.failureCount
        },
        includesPartitionAppendix: result.includesPartitionAppendix,
        provenanceWarnings: result.provenanceWarnings ?? []
      },
      provenanceVersion: result.provenanceVersion,
      observed: result.observed,
      derived: result.derived,
      synthesis: result.synthesis,
      compat: result.compat,
      includesPartitionAppendix: result.includesPartitionAppendix
    },
    null,
    2
  );
}

function buildTailwindTheme(result: ResultRecord): string {
  const colorLines = result.palette.map((token) => `  --color-${toSlug(token.name)}: ${token.value};`);
  const fontLines = result.typography.map((token) => `  --font-${toSlug(token.name)}: ${token.family};`);
  const spacingLines = result.spacing.map((token) => `  --spacing-${token.name}: ${token.value};`);
  const radiusLines = result.borderRadii.map((radius, index) => `  --radius-${index}: ${radius};`);

  return `@theme {\n${[...colorLines, ...fontLines, ...spacingLines, ...radiusLines].join("\n")}\n}`;
}

function buildCssVariables(result: ResultRecord): string {
  const colorLines = result.palette.map((token) => `  --${toSlug(token.name)}: ${token.value};`);
  const fontLines = result.typography.map((token) => `  --font-${toSlug(token.name)}: ${token.family};`);
  const spacingLines = result.spacing.map((token) => `  --spacing-${token.name}: ${token.value};`);
  const radiusLines = result.borderRadii.map((radius, index) => `  --radius-${index}: ${radius};`);
  const shadowLines = result.shadows.map((token) => `  --shadow-${toSlug(token.name)}: ${token.value};`);

  return `:root {\n${[...colorLines, ...fontLines, ...spacingLines, ...radiusLines, ...shadowLines].join("\n")}\n}`;
}

function buildDesignTokens(result: ResultRecord, meta: ExportMeta): string {
  const derivedDesignSystem = getDerivedDesignSystem(result);
  return JSON.stringify(
    {
      meta: {
        confidence: meta.confidence,
        pageCount: meta.pageCount,
        failureCount: meta.failureCount,
        includesPartitionAppendix: result.includesPartitionAppendix
      },
      color: Object.fromEntries(
        result.palette.map((token) => [
          toSlug(token.name),
          {
            value: token.value,
            role: token.role
          }
        ])
      ),
      typography: Object.fromEntries(
        result.typography.map((token) => [
          toSlug(token.name),
          {
            family: token.family,
            weight: token.weight,
            size: token.size,
            lineHeight: token.lineHeight,
            letterSpacing: token.letterSpacing,
            usage: token.usage,
            sample: token.sample
          }
        ])
      ),
      spacing: Object.fromEntries(result.spacing.map((token) => [token.name, token.value])),
      shadows: Object.fromEntries(result.shadows.map((token) => [token.name, token.value])),
      borderRadii: result.borderRadii,
      inferred: Object.fromEntries(derivedDesignSystem.sections.map((section) => [section.id, section]))
    },
    null,
    2
  );
}

export function buildExportArtifacts({ result, meta }: BuildExportArtifactsArgs): ExportArtifact[] {
  return EXPORT_TABS.map((tab): ExportArtifact => {
    switch (tab) {
      case "DESIGN.md":
        return { tab, status: "ready", content: buildDesignMarkdown(result) };
      case "Design JSON":
        return { tab, status: "ready", content: buildDesignJson(result, meta) };
      case "Tailwind v4":
        return { tab, status: "ready", content: buildTailwindTheme(result) };
      case "CSS Variables":
        return { tab, status: "ready", content: buildCssVariables(result) };
      case "Design Tokens":
        return { tab, status: "ready", content: buildDesignTokens(result, meta) };
      default:
        return { tab, status: "placeholder", content: "" };
    }
  });
}
