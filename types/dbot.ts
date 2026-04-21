export const JOB_STAGES = ["Discover", "Partition", "Extract", "Generate", "Validate"] as const;

export const EXPORT_TABS = ["DESIGN.md", "Design JSON", "Tailwind v4", "CSS Variables", "Design Tokens"] as const;

export type JobStageName = (typeof JOB_STAGES)[number];
export type ExportTabName = (typeof EXPORT_TABS)[number];
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobStageStatus = "pending" | "running" | "completed" | "failed";
export type StageStripStatus = "idle" | "current" | "complete";
export type FixtureKey = "singleExperience" | "multiExperience" | "lowConfidence";

export interface UrlValidationState {
  isValid: boolean;
  raw: string;
  normalized?: string;
  domain?: string;
  reason?: string;
}

export interface GenerateRequestPayload {
  url: string;
  selectedPresetIds: string[];
  selectedCategoryIds: string[];
  geminiApiKey?: string;
  geminiModel?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  summary: string;
  categories: string[];
  palette: string[];
}

export interface StageItem {
  label: JobStageName;
  status: StageStripStatus;
}

export interface JobStage {
  name: JobStageName;
  status: JobStageStatus;
  startedAt: string | null;
  endedAt: string | null;
  message: string | null;
  error: string | null;
}

export interface CrawledPageEvidence {
  url: string;
  title: string;
  headings: string[];
  description: string | null;
  textSnippets: string[];
  themeColor?: string | null;
  accentColors?: string[];
  fontFamilies?: string[];
  fontSizes?: string[];
  fontWeights?: string[];
  letterSpacings?: string[];
  lineHeights?: string[];
  borderRadii?: string[];
  boxShadows?: string[];
  spacingValues?: string[];
  backgroundColors?: string[];
  iconSamples?: IconSample[];
}

export interface CrawlEvidence {
  pages: CrawledPageEvidence[];
  failures: Array<{
    url: string;
    reason: string;
  }>;
  screenshotBase64?: string;
}

export interface ExtractedBrandSignals {
  siteTitle: string;
  vibe: string;
  narrative: string;
  tags: string[];
  confidence: PartitionRecord["confidence"];
  partitions: PartitionRecord[];
  riskLabels: RiskLabel[];
}

export interface JobRecord {
  id: string;
  submittedUrl: string;
  selectedPresetIds: string[];
  selectedCategoryIds: string[];
  geminiApiKey?: string;
  geminiModel?: string;
  fixtureKey?: FixtureKey;
  status: JobStatus;
  currentStage: JobStageName;
  createdAt: string;
  updatedAt: string;
  stages: JobStage[];
  evidence?: CrawlEvidence;
  extracted?: ExtractedBrandSignals;
  result?: ResultRecord;
  failureStage?: JobStageName;
  failureMessage?: string;
  retryCount?: number;
  lastRetriedAt?: string;
}

export interface RiskLabel {
  label: string;
  scope: string;
}

export interface PartitionRecord {
  id: string;
  title: string;
  rationale: string;
  scopeSummary: string;
  confidence: "high" | "medium" | "low";
  riskLabels: RiskLabel[];
}

export interface BrandSummary {
  title: string;
  vibe: string;
  narrative: string;
  tags: string[];
  sourceUrl: string;
}

export interface PaletteToken {
  name: string;
  value: string;
  role: string;
}

export interface TypographyToken {
  name: string;
  family: string;
  weight?: string;
  size?: string;
  lineHeight?: string;
  letterSpacing?: string;
  usage: string;
  sample: string;
}

export interface SpacingToken {
  name: string;
  value: string;
}

export interface ShadowToken {
  name: string;
  value: string;
}

export type DerivedDesignSystemSectionId = "buttons" | "icons" | "spacing" | "material" | "motion" | "rendering";
export type DerivedDesignSystemConfidence = "observed" | "inferred" | "mixed";

export interface DerivedDesignSystemMetric {
  label: string;
  value: string;
}

export interface DerivedDesignSystemValueGroup {
  label: string;
  values: string[];
}

export interface DerivedDesignSystemShowcase {
  eyebrow: string;
  title: string;
  description: string;
  cta?: string;
  note?: string;
}

export interface DerivedDesignSystemCallout {
  label: string;
  title: string;
  description: string;
  badge?: string;
}

export interface DerivedDesignSystemReference {
  label: string;
  language?: string;
  content: string;
}

export interface DerivedDesignSystemSection {
  id: DerivedDesignSystemSectionId;
  title: string;
  meta: string;
  summary: string;
  confidence: DerivedDesignSystemConfidence;
  metrics: DerivedDesignSystemMetric[];
  tags?: string[];
  groups?: DerivedDesignSystemValueGroup[];
  showcase?: DerivedDesignSystemShowcase;
  callout?: DerivedDesignSystemCallout;
  references?: DerivedDesignSystemReference[];
  iconSamples?: IconSample[];
}

export interface DerivedDesignSystem {
  sections: DerivedDesignSystemSection[];
}

export interface ComponentPreview {
  label: string;
  detail: string;
}

export interface GuidelineSet {
  dos: string[];
  donts: string[];
}

export type ProvenanceSource = "crawl-html" | "crawl-browser" | "gemini" | "derived-rule";
export type ProvenanceKind = "observed" | "derived" | "synthesized";
export type PageRole = "root" | "workspace" | "docs" | "marketing" | "other";

export interface IconSample {
  label: string;
  svg: string;
  source: "crawl-html" | "crawl-browser";
}

export interface EvidenceRef {
  url: string;
  pageRole: PageRole;
  selector?: string;
  excerpt?: string;
}

export interface ProvenancedValue<T> {
  kind: ProvenanceKind;
  source: ProvenanceSource;
  value: T;
  refs: EvidenceRef[];
  fallbackReason?: string;
}

export interface BrowserObservedTypography {
  role: "heading" | "body" | "label" | "button";
  selector: string;
  excerpt: string;
  family?: string;
  size?: string;
  weight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  color?: string;
}

export interface BrowserObservedSurface {
  kind: "button" | "card" | "input";
  selector: string;
  excerpt: string;
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  padding?: string;
}

export interface BrowserObservedIcon extends IconSample {
  selector: string;
  width: number;
  height: number;
}

export interface BrowserObservedPage {
  url: string;
  finalUrl: string;
  pageRole: PageRole;
  title: string;
  cssVariables: Record<string, string>;
  typography: BrowserObservedTypography[];
  surfaces: BrowserObservedSurface[];
  icons?: BrowserObservedIcon[];
}

export interface DerivedVisualDna {
  meta: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  tags: string[];
}

export interface ObservedResultSnapshot {
  evidence: {
    htmlPages: CrawledPageEvidence[];
    browserPages: BrowserObservedPage[];
  };
  palette: ProvenancedValue<PaletteToken[]>;
  typography: ProvenancedValue<TypographyToken[]>;
  spacing: ProvenancedValue<SpacingToken[]>;
  shadows: ProvenancedValue<ShadowToken[]>;
  borderRadii: ProvenancedValue<string[]>;
}

export interface DerivedResultSnapshot {
  brand: ProvenancedValue<{
    title: string;
    vibe: string;
    tags: string[];
    sourceUrl: string;
  }>;
  visualDna: ProvenancedValue<DerivedVisualDna>;
  componentLanguage: ProvenancedValue<ComponentPreview[]>;
  sections: ProvenancedValue<DerivedDesignSystemSection[]>;
  partitions: ProvenancedValue<PartitionRecord[]>;
  riskLabels: ProvenancedValue<RiskLabel[]>;
}

export interface SynthesizedResultSnapshot {
  narrative: ProvenancedValue<string>;
  guidelines: ProvenancedValue<GuidelineSet>;
}

export interface ExportArtifact {
  tab: ExportTabName;
  status: "ready" | "placeholder" | "unavailable";
  content: string;
}

export interface ResultCompatRecord {
  site: {
    canonicalUrl: string;
    domain: string;
    title: string;
  };
  brandSummary: BrandSummary;
  palette: PaletteToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  borderRadii: string[];
  iconSamples?: IconSample[];
  derivedDesignSystem?: DerivedDesignSystem;
  componentPreviews: ComponentPreview[];
  guidelines: GuidelineSet;
  exports: ExportArtifact[];
  partitions: PartitionRecord[];
  riskLabels: RiskLabel[];
  provenanceWarnings?: string[];
  includesPartitionAppendix: boolean;
}

export interface ResultRecord extends ResultCompatRecord {
  provenanceVersion: 1;
  observed: ObservedResultSnapshot;
  derived: DerivedResultSnapshot;
  synthesis: SynthesizedResultSnapshot;
  compat: ResultCompatRecord;
}

export interface MockRun {
  job: JobRecord;
  result: ResultRecord;
}

export interface JobSnapshot {
  job: JobRecord;
  result?: ResultRecord;
}

export interface CreateJobResponse {
  jobId: string;
  route: string;
  snapshot: JobSnapshot;
}
