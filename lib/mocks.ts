import { JOB_STAGES, JobRecord, MockRun, ResultRecord, StylePreset } from "@/types/dbot";
import { deriveDesignSystemSections, deriveVisualDna } from "@/lib/design-system-inference";
import { buildExportArtifacts } from "@/lib/exports";

export const styleCategories = ["All", "AI", "Light", "Dark", "SaaS", "Fintech", "E-commerce", "DevTools"] as const;

export const stylePresets: StylePreset[] = [
  {
    id: "duolingo",
    name: "Duolingo",
    summary: "Vivid green simplicity with friendly learning cues.",
    categories: ["AI", "Light"],
    palette: ["#58CC02", "#89E219", "#102B14"]
  },
  {
    id: "intercom",
    name: "Intercom",
    summary: "Monochrome command center with product-led restraint.",
    categories: ["AI", "SaaS", "Light"],
    palette: ["#111111", "#F5F1EA", "#D5CDC3"]
  },
  {
    id: "revolut",
    name: "Revolut Pulse",
    summary: "Clean fintech utility with disciplined grayscale and sky accents.",
    categories: ["Fintech", "Light"],
    palette: ["#191C1F", "#505A63", "#89C6FF"]
  },
  {
    id: "linear",
    name: "Linear Night Shift",
    summary: "Deep navy precision with high-contrast framing.",
    categories: ["Dark", "DevTools", "SaaS"],
    palette: ["#0B1020", "#8EA2FF", "#F5F7FF"]
  }
];

function buildStages(currentStage: JobRecord["currentStage"], status: JobRecord["status"]) {
  const currentIndex = JOB_STAGES.indexOf(currentStage);
  const now = "2026-04-09T14:00:00.000Z";

  return JOB_STAGES.map((name, index) => ({
    name,
    status:
      status === "failed" && index === currentIndex
        ? "failed"
        : index < currentIndex
          ? "completed"
          : index === currentIndex
            ? status === "completed"
              ? "completed"
              : "running"
            : "pending",
    startedAt: index <= currentIndex ? now : null,
    endedAt: index < currentIndex || status === "completed" ? now : null,
    message:
      name === "Partition"
        ? "Grouped marketing, docs, and workspace surfaces into one brand system."
        : name === currentStage
          ? "Current stage in progress."
          : null,
    error: status === "failed" && index === currentIndex ? "Fixture-only failure placeholder." : null
  })) as JobRecord["stages"];
}

function buildResult(title: string, url: string, confidence: "high" | "medium" | "low"): ResultRecord {
  const site = {
    canonicalUrl: url,
    domain: new URL(url).hostname,
    title
  };
  const brandSummary = {
    title,
    vibe: "Measured, modern, signal-heavy product voice.",
    narrative:
      "The system uses one main brand language across public marketing, product entry points, and support surfaces, then annotates divergence in the partition appendix.",
    tags: ["fintech", "minimalist", "clean", confidence === "low" ? "low-confidence" : "high-clarity"],
    sourceUrl: url
  };
  const palette = [
    { name: "Midnight Ink", value: "#191C1F", role: "Primary text and strong UI chrome" },
    { name: "Steel Gray", value: "#505A63", role: "Secondary text and iconography" },
    { name: "Cloud White", value: "#FFFFFF", role: "Canvas and elevated cards" },
    { name: "Signal Sky", value: "#89C6FF", role: "Accent and focus affordances" }
  ];
  const typography = [
    { name: "Display", family: "ui-serif, Georgia", weight: "700", size: "48px", lineHeight: "1.1", letterSpacing: "-0.04em", usage: "Editorial hero moments", sample: "Revolut Pulse" },
    { name: "Body", family: "ui-sans-serif, system-ui", weight: "400", size: "15px", lineHeight: "1.6", usage: "Dense operational copy", sample: "Modern utility text" }
  ];
  const spacing = [
    { name: "xs", value: "4px" },
    { name: "sm", value: "8px" },
    { name: "md", value: "16px" },
    { name: "lg", value: "24px" },
    { name: "xl", value: "48px" }
  ];
  const shadows = [
    { name: "sm", value: "0 1px 2px rgba(0,0,0,0.05)" },
    { name: "md", value: "0 4px 12px rgba(0,0,0,0.08)" }
  ];
  const borderRadii = ["4px", "8px", "12px"];
  const componentPreviews = [
    { label: "Logo", detail: "High-contrast wordmark in a quiet header rail." },
    { label: "Hero Heading", detail: "One dominant headline, tight line-height, no decorative flourish." },
    { label: "Primary CTA", detail: "Dark-filled button with compact radius and assertive spacing." }
  ];
  const guidelines = {
    dos: [
      "Use the accent blue sparingly for focus and guided action.",
      "Keep hero typography crisp and unembellished.",
      "Carry one spacing rhythm across cards, filters, and export tabs."
    ],
    donts: [
      "Do not split same-domain experiences into separate top-level DESIGN.md files.",
      "Do not hide low-confidence findings; annotate them at the partition level.",
      "Do not let export tab naming drift from the canonical product language."
    ]
  };
  const partitions: ResultRecord["partitions"] = [
    {
      id: "marketing",
      title: "Marketing site",
      rationale: "Primary landing pages establish brand language and acquisition framing.",
      scopeSummary: "Homepage, feature pages, pricing.",
      confidence: "high",
      riskLabels: []
    },
    {
      id: "workspace",
      title: "Workspace preview",
      rationale: "Publicly reachable app shell shares core tokens but shifts density.",
      scopeSummary: "Dashboard shell, nav, public-facing logged-out states.",
      confidence,
      riskLabels: confidence === "low" ? [{ label: "Low confidence", scope: "Workspace partition" }] : []
    }
  ];
  const riskLabels: ResultRecord["riskLabels"] =
    confidence === "low" ? [{ label: "Low confidence", scope: "Partition appendix" }] : [];

  const compatSeed = {
    site,
    brandSummary,
    palette,
    typography,
    spacing,
    shadows,
    borderRadii,
    derivedDesignSystem: undefined,
    componentPreviews,
    guidelines,
    exports: [],
    partitions,
    riskLabels,
    provenanceWarnings: [],
    includesPartitionAppendix: true
  };

  const derivedSections = deriveDesignSystemSections(compatSeed).sections;
  const compat = {
    ...compatSeed,
    derivedDesignSystem: { sections: derivedSections }
  };

  const result: ResultRecord = {
    provenanceVersion: 1,
    observed: {
      evidence: {
        htmlPages: [],
        browserPages: []
      },
      palette: {
        kind: "observed",
        source: "crawl-html",
        value: palette,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      typography: {
        kind: "observed",
        source: "crawl-html",
        value: typography,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      spacing: {
        kind: "observed",
        source: "crawl-html",
        value: spacing,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      shadows: {
        kind: "observed",
        source: "crawl-html",
        value: shadows,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      borderRadii: {
        kind: "observed",
        source: "crawl-html",
        value: borderRadii,
        refs: [{ url, pageRole: "root", excerpt: title }]
      }
    },
    derived: {
      brand: {
        kind: "derived",
        source: "derived-rule",
        value: {
          title,
          vibe: brandSummary.vibe,
          tags: brandSummary.tags,
          sourceUrl: url
        },
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      visualDna: {
        kind: "derived",
        source: "derived-rule",
        value: deriveVisualDna(compat),
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      componentLanguage: {
        kind: "derived",
        source: "derived-rule",
        value: componentPreviews,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      sections: {
        kind: "derived",
        source: "derived-rule",
        value: derivedSections,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      partitions: {
        kind: "derived",
        source: "derived-rule",
        value: partitions,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      riskLabels: {
        kind: "derived",
        source: "derived-rule",
        value: riskLabels,
        refs: [{ url, pageRole: "root", excerpt: title }]
      }
    },
    synthesis: {
      narrative: {
        kind: "synthesized",
        source: "gemini",
        value: brandSummary.narrative,
        refs: [{ url, pageRole: "root", excerpt: title }]
      },
      guidelines: {
        kind: "synthesized",
        source: "gemini",
        value: guidelines,
        refs: [{ url, pageRole: "root", excerpt: title }]
      }
    },
    compat: {
      ...compat,
      brandSummary: {
        ...brandSummary,
        narrative: brandSummary.narrative
      }
    },
    site: {
      ...site
    },
    brandSummary,
    palette,
    typography,
    spacing,
    shadows,
    borderRadii,
    derivedDesignSystem: { sections: derivedSections },
    componentPreviews,
    guidelines,
    partitions,
    riskLabels,
    provenanceWarnings: [],
    includesPartitionAppendix: true,
    exports: []
  };

  const exports = buildExportArtifacts({
    result,
    meta: {
      confidence,
      pageCount: 2,
      failureCount: confidence === "low" ? 1 : 0
    }
  });

  return {
    ...result,
    exports,
    compat: {
      ...result.compat,
      exports
    }
  };
}

export const fixtureRuns: Record<"singleExperience" | "multiExperience" | "lowConfidence", MockRun> = {
  singleExperience: {
    job: {
      id: "job_single_experience",
      submittedUrl: "https://dbot.dev",
      selectedPresetIds: ["intercom"],
      selectedCategoryIds: ["AI"],
      fixtureKey: "singleExperience",
      status: "completed",
      currentStage: "Validate",
      createdAt: "2026-04-09T13:45:00.000Z",
      updatedAt: "2026-04-09T13:46:20.000Z",
      stages: buildStages("Validate", "completed")
    },
    result: buildResult("Dbot", "https://dbot.dev", "high")
  },
  multiExperience: {
    job: {
      id: "job_multi_experience",
      submittedUrl: "https://revolut.com",
      selectedPresetIds: ["revolut"],
      selectedCategoryIds: ["Fintech"],
      fixtureKey: "multiExperience",
      status: "completed",
      currentStage: "Validate",
      createdAt: "2026-04-09T13:45:00.000Z",
      updatedAt: "2026-04-09T13:46:20.000Z",
      stages: buildStages("Validate", "completed")
    },
    result: buildResult("Revolut Pulse", "https://revolut.com", "medium")
  },
  lowConfidence: {
    job: {
      id: "job_low_confidence",
      submittedUrl: "https://example.com",
      selectedPresetIds: ["linear"],
      selectedCategoryIds: ["Dark"],
      fixtureKey: "lowConfidence",
      status: "running",
      currentStage: "Generate",
      createdAt: "2026-04-09T13:45:00.000Z",
      updatedAt: "2026-04-09T13:46:20.000Z",
      stages: buildStages("Generate", "running")
    },
    result: buildResult("Example Platform", "https://example.com", "low")
  }
};
