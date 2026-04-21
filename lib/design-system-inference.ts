import {
  DerivedDesignSystem,
  DerivedDesignSystemSection,
  DerivedVisualDna,
  ResultCompatRecord,
} from "@/types";

function parseNumericToken(value: string): number | null {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function formatPx(value: number | null, fallback: string): string {
  if (value === null || Number.isNaN(value)) return fallback;
  return `${value}px`;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function summarizeButtonTone(result: ResultCompatRecord): string {
  const primary = result.palette[0]?.value ?? "#111111";
  const radiusValues = result.borderRadii.map(parseNumericToken).filter((value): value is number => value !== null);
  const rounded = radiusValues.length > 0 && Math.max(...radiusValues) >= 12;
  return `${rounded ? "Soft" : "Compact"} fill on ${primary}`;
}

function inferIconTone(result: ResultCompatRecord): string {
  const shadowCount = result.shadows.length;
  return shadowCount > 1 ? "Outline + status accents" : "Minimal outline";
}

function inferMotionLevel(result: ResultCompatRecord): string {
  const tags = result.brandSummary.tags.join(" ").toLowerCase();
  if (tags.includes("minimal") || tags.includes("clean")) return "Controlled";
  if (result.componentPreviews.length >= 4) return "Moderate";
  return "Subtle";
}

function inferRenderingMode(result: ResultCompatRecord): string {
  const tags = result.brandSummary.tags.join(" ").toLowerCase();
  if (tags.includes("3d") || tags.includes("webgl") || tags.includes("immersive")) return "Graphics-led";
  return "DOM-first";
}

function buildButtonsSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const ctaPreview = result.componentPreviews.find((preview) => /cta|button/i.test(preview.label));
  const styleCount = Math.max(3, Math.min(5, result.componentPreviews.length + 1));
  const radiusValues = result.borderRadii.map(parseNumericToken).filter((value): value is number => value !== null);
  const compactRadius = radiusValues.length > 0 ? `${Math.min(...radiusValues)}-${Math.max(...radiusValues)}px` : "Mixed";

  return {
    id: "buttons",
    title: "Buttons",
    meta: `${styleCount} styles`,
    summary:
      "Action language is inferred from component previews, palette contrast, and guidance tone. The system favors one dominant primary action with quieter secondary and text-link treatments around it.",
    confidence: "mixed",
    showcase: {
      eyebrow: "Action language",
      title: ctaPreview?.label ?? "Primary action",
      description: ctaPreview?.detail ?? "Primary calls to action should read as the loudest control in the system.",
      cta: "Primary action",
      note: "Secondary actions should stay lighter in fill and rely on border or text emphasis."
    },
    metrics: [
      { label: "Primary action", value: summarizeButtonTone(result) },
      { label: "Secondary action", value: "Outline or text-only support" },
      { label: "Radius", value: compactRadius },
      { label: "Density", value: result.componentPreviews.length > 2 ? "Compact" : "Focused" }
    ],
    tags: ["Primary CTA", "Secondary", "Text link", "Quiet chrome"]
  };
}

function buildIconsSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const iconSamples = result.iconSamples?.slice(0, 8) ?? [];
  const observedSourceCount = new Set(iconSamples.map((sample) => sample.source)).size;

  return {
    id: "icons",
    title: "Icons",
    meta: iconSamples.length > 0 ? `${iconSamples.length} samples` : "Utility set",
    summary:
      iconSamples.length > 0
        ? `Representative icon samples were extracted directly from ${observedSourceCount > 1 ? "browser-visible SVGs and inline HTML SVGs" : iconSamples[0].source === "crawl-browser" ? "browser-visible SVGs" : "inline HTML SVGs"}.`
        : "No explicit icon library was extracted. The surrounding UI signals point to a restrained utility icon system that stays secondary to typography and uses accent color sparingly for status or active state.",
    confidence: iconSamples.length > 0 ? "observed" : "inferred",
    metrics: [
      { label: "Family", value: iconSamples.length > 0 ? "Observed SVG set" : "Minimal line icons" },
      { label: "Tone", value: inferIconTone(result) },
      { label: "Role", value: "Navigation + status support" },
      { label: "Coverage", value: iconSamples.length > 0 ? `${iconSamples.length} captured` : "Signals only" }
    ],
    tags: ["Outline", "Navigation", "Status", "Utility"],
    iconSamples
  };
}

function buildSpacingSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const spacingValues = result.spacing
    .map((token) => ({ raw: token.value, numeric: parseNumericToken(token.value) }))
    .filter((token): token is { raw: string; numeric: number } => token.numeric !== null)
    .sort((a, b) => a.numeric - b.numeric);

  const baseUnit = spacingValues[0]?.numeric ?? 4;
  const railStack = spacingValues.find((token) => token.numeric >= baseUnit)?.raw ?? `${baseUnit}px`;
  const sectionGap = spacingValues.find((token) => token.numeric >= baseUnit * 2)?.raw ?? `${baseUnit * 2}px`;
  const framePadding = spacingValues.find((token) => token.numeric >= baseUnit * 4)?.raw ?? `${baseUnit * 4}px`;
  const extendedScale = dedupe(
    spacingValues
      .map((token) => token.raw)
      .filter((value) => ![railStack, sectionGap, framePadding].includes(value))
  );

  return {
    id: "spacing",
    title: "Spacing",
    meta: `${railStack} / ${sectionGap} / ${framePadding} rhythm`,
    summary:
      `Observed spacing resolves into three active layout tiers: ${railStack} for dense sidebar stacking, ${sectionGap} for structural gaps between peer regions, and ${framePadding} for the outer page frame. Larger values extend the same system instead of introducing a second spacing language.`,
    confidence: "observed",
    metrics: [
      { label: "Base unit", value: formatPx(baseUnit, "4px") },
      { label: "Rail stack", value: railStack },
      { label: "Section gap", value: sectionGap },
      { label: "Frame padding", value: framePadding }
    ],
    groups: [
      { label: "Scale", values: dedupe([railStack, sectionGap, framePadding, ...extendedScale]) },
      { label: "Sidebar rail", values: [railStack] },
      { label: "Structural gaps", values: [sectionGap] },
      { label: "Page frame", values: [framePadding] },
      ...(extendedScale.length > 0 ? [{ label: "Extended scale", values: extendedScale }] : [])
    ]
  };
}

function buildMaterialSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const radii = result.borderRadii.map(parseNumericToken).filter((value): value is number => value !== null);
  const dominantRadius = radii.length > 0 ? `${Math.max(...radii)}px` : "8px";
  const primaryShadow = result.shadows[1]?.value ?? result.shadows[0]?.value ?? "none";
  const blurValue = parseNumericToken(primaryShadow);
  const surfaceMode = result.shadows.length > 0 ? "Soft depth" : "Flat surface";

  return {
    id: "material",
    title: "Material",
    meta: surfaceMode,
    summary:
      "Material treatment is drawn from the extracted border radius and shadow stack. Surfaces rely on clean panel separation, understated borders, and controlled elevation instead of decorative glow.",
    confidence: "mixed",
    callout: {
      label: "Technique",
      title: "Panel-first framing",
      description:
        "Wrap content in subtle surface panels with a low-contrast stroke and let shadow act as supporting depth, not the primary visual effect.",
      badge: result.shadows.length > 0 ? "Observed" : "Inferred"
    },
    metrics: [
      { label: "Surface", value: surfaceMode },
      { label: "Border", value: "1px understated stroke" },
      { label: "Shadow", value: primaryShadow },
      { label: "Radius", value: dominantRadius },
      { label: "Blur", value: blurValue ? `${blurValue}px max` : "None detected" }
    ]
  };
}

function buildMotionSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const level = inferMotionLevel(result);
  const durations = level === "Controlled" ? ["120ms", "180ms", "240ms"] : level === "Moderate" ? ["160ms", "220ms", "300ms"] : ["100ms", "160ms", "220ms"];
  const hoverPatterns = result.componentPreviews.some((preview) => /cta|button/i.test(preview.label))
    ? ["Color", "Stroke", "Opacity"]
    : ["Opacity", "Color"];

  return {
    id: "motion",
    title: "Motion",
    meta: level,
    summary:
      "Motion guidance is inferred from brand tone and interface density rather than directly observed animation code. The safest read is restrained, interface-led movement that sharpens hierarchy without turning into spectacle.",
    confidence: "inferred",
    metrics: [
      { label: "Motion level", value: level },
      { label: "Durations", value: durations.join(" / ") },
      { label: "Easing", value: "ease-out / standard cubic-bezier" },
      { label: "Hover patterns", value: hoverPatterns.join(" + ") }
    ],
    tags: [...durations, ...hoverPatterns]
  };
}

function buildRenderingSection(result: ResultCompatRecord): DerivedDesignSystemSection {
  const mode = inferRenderingMode(result);
  const domFirst = mode === "DOM-first";

  return {
    id: "rendering",
    title: "Rendering",
    meta: mode,
    summary: domFirst
      ? "No strong WebGL or canvas signature was extracted from the current result. The interface reads as DOM-first, with hierarchy carried by typography, panel contrast, borders, and restrained transitions."
      : "The extracted result suggests a graphics-led rendering layer that likely relies on canvas or WebGL-style effects behind the DOM interface.",
    confidence: domFirst ? "inferred" : "mixed",
    metrics: [
      { label: "Stack", value: domFirst ? "HTML + CSS" : "Canvas-backed surface" },
      { label: "Scene", value: domFirst ? "Panel-led interface" : "Full-bleed background field" },
      { label: "Effect", value: domFirst ? "Surface contrast + typography" : "Graphics-led atmosphere" },
      { label: "Interaction", value: domFirst ? "Hover + focus states" : "Pointer-reactive drift" },
      { label: "Render", value: domFirst ? "Standard DOM" : "Hybrid DOM + graphics" }
    ],
    tags: domFirst ? ["DOM-first", "Accessible", "Panel-led"] : ["Canvas", "Background effect", "Hybrid"],
    references: domFirst
      ? undefined
      : [
          {
            label: "HTML reference",
            language: "html",
            content: "<canvas class=\"fixed inset-0 pointer-events-none\"></canvas>"
          },
          {
            label: "JS reference",
            language: "js",
            content: "const ctx = canvas.getContext('2d');\n// animate a restrained particle field behind the DOM interface"
          }
        ]
  };
}

export function deriveVisualDna(result: ResultCompatRecord): DerivedVisualDna {
  const spacingValues = result.spacing
    .map((token) => parseNumericToken(token.value))
    .filter((value): value is number => value !== null);
  const maxSpacing = spacingValues.length > 0 ? Math.max(...spacingValues) : 0;
  const radii = result.borderRadii
    .map(parseNumericToken)
    .filter((value): value is number => value !== null);

  return {
    meta: result.site.domain.split(".")[0] || "System",
    metrics: [
      { label: "Layout", value: result.partitions.length > 1 ? "Grid" : "Single flow" },
      { label: "Content Width", value: maxSpacing >= 40 ? "Full Bleed" : "Contained" },
      { label: "Framing", value: radii.length > 0 ? "Soft cards" : "Sharp rails" },
      { label: "Density", value: result.componentPreviews.length > 2 ? "Layered" : "Focused" }
    ],
    tags: result.brandSummary.tags
  };
}

export function deriveDesignSystemSections(result: ResultCompatRecord): DerivedDesignSystem {
  return {
    sections: [
      buildButtonsSection(result),
      buildIconsSection(result),
      buildSpacingSection(result),
      buildMaterialSection(result),
      buildMotionSection(result),
      buildRenderingSection(result)
    ]
  };
}

export function getDerivedDesignSystem(result: ResultCompatRecord): DerivedDesignSystem {
  return result.derivedDesignSystem ?? deriveDesignSystemSections(result);
}
