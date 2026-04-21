"use client";

import { CSSProperties, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MockRun } from "@/types/dbot";
import { SectionCard } from "@/components/shared/section-card";
import { DerivedDesignSystemSection } from "@/types";
import { getDerivedDesignSystem } from "@/lib/design-system-inference";

interface WorkbenchShellProps {
  run: MockRun;
  headerNotice?: ReactNode;
}

const humanTheme = {
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  surface: "var(--panel)",
  surfaceStrong: "var(--panel-strong)",
  surfaceSoft: "var(--panel-soft)",
  surfaceContrast: "var(--panel-contrast)",
  text: "var(--text)",
  textSoft: "var(--text-soft)",
  textMuted: "var(--subtle)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  success: "var(--success)",
  successSoft: "var(--success-soft)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  info: "var(--info)",
  infoSoft: "var(--info-soft)",
  codeBg: "#0c1222",
  codeBorder: "#24324a",
  codeText: "#cbd5e1",
  codeStrong: "#f8fafc",
  codeAccent: "#93c5fd",
  codeValue: "#7aa2ff",
  codeKey: "#6ee7b7",
  codeMuted: "#64748b",
};

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, "").replace(/\s+/g, " ").trim();
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* clipboard api may fail in embedded browser contexts */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const didCopy = await copyTextToClipboard(text);

    if (didCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-[8px] border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function ShareButton({ fallbackUrl }: { fallbackUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href || fallbackUrl : fallbackUrl;
    const didCopy = await copyTextToClipboard(shareUrl);

    if (didCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [fallbackUrl]);

  return (
    <div className="relative shrink-0">
      <button
        data-testid="results-share-button"
        type="button"
        aria-label={copied ? "Link copied" : "Copy result link"}
        title={copied ? "Link copied" : "Copy result link"}
        onClick={handleShare}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] border bg-panelAlt transition ${
          copied ? "border-info text-info" : "border-border text-muted hover:border-borderStrong hover:text-text"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
          <path d="M12 15V5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 9l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 14.5v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {copied ? (
        <span
          data-testid="results-share-feedback"
          className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-[8px] border border-info bg-infoSoft px-2.5 py-1 text-[11px] font-medium text-info shadow-panel"
        >
          Link copied
        </span>
      ) : null}
    </div>
  );
}

type CodeSyntax = "markdown" | "json" | "css";

function renderJsonValueToken(value: string) {
  if (
    value === "{" ||
    value === "}" ||
    value === "[" ||
    value === "]" ||
    value === "{}" ||
    value === "[]"
  ) {
    return <span style={{ color: humanTheme.codeMuted }}>{value}</span>;
  }

  if (/^"/.test(value)) {
    return <span style={{ color: humanTheme.codeValue }}>{value}</span>;
  }

  if (/^(true|false|null)$/u.test(value)) {
    return <span style={{ color: humanTheme.codeAccent }}>{value}</span>;
  }

  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/u.test(value)) {
    return <span style={{ color: humanTheme.codeValue }}>{value}</span>;
  }

  return <span style={{ color: humanTheme.codeText }}>{value}</span>;
}

function renderJsonCodeLine(line: string) {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const trimmed = line.trim();

  if (!trimmed) {
    return <span style={{ color: humanTheme.codeText }}>{line}</span>;
  }

  const hasTrailingComma = trimmed.endsWith(",");
  const core = hasTrailingComma ? trimmed.slice(0, -1) : trimmed;
  const keyValueMatch = core.match(/^("(?:\\.|[^"\\])*"):\s*(.+)$/u);

  if (keyValueMatch) {
    const [, key, rawValue] = keyValueMatch;

    return (
      <span>
        {indent}
        <span style={{ color: humanTheme.codeAccent }}>{key}</span>
        <span style={{ color: humanTheme.codeMuted }}>: </span>
        {renderJsonValueToken(rawValue)}
        {hasTrailingComma ? <span style={{ color: humanTheme.codeMuted }}>,</span> : null}
      </span>
    );
  }

  return (
    <span>
      {indent}
      {renderJsonValueToken(core)}
      {hasTrailingComma ? <span style={{ color: humanTheme.codeMuted }}>,</span> : null}
    </span>
  );
}

function ColoredCodeLine({ line, syntax }: { line: string; syntax: CodeSyntax }) {
  if (syntax === "json") {
    return renderJsonCodeLine(line);
  }

  if (line.startsWith("# ")) {
    return <span className="font-bold" style={{ color: humanTheme.codeStrong }}>{line}</span>;
  }
  if (line.startsWith("## ")) {
    return <span className="font-semibold" style={{ color: humanTheme.codeAccent }}>{line}</span>;
  }
  if (line.startsWith("- ")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 1) {
      return (
        <span>
          <span style={{ color: humanTheme.codeKey }}>{line.slice(0, colonIdx)}</span>
          <span style={{ color: humanTheme.codeMuted }}>:</span>
          <span style={{ color: humanTheme.codeText }}>{line.slice(colonIdx + 1)}</span>
        </span>
      );
    }
    return <span style={{ color: humanTheme.codeText }}>{line}</span>;
  }
  if (line.startsWith("@") || line.startsWith(":root")) {
    return <span style={{ color: humanTheme.codeValue }}>{line}</span>;
  }
  if (line.includes("--")) {
    const parts = line.split(":");
    if (parts.length >= 2) {
      return (
        <span>
          <span style={{ color: humanTheme.codeAccent }}>{parts[0]}</span>
          <span style={{ color: humanTheme.codeMuted }}>:</span>
          <span style={{ color: humanTheme.codeValue }}>{parts.slice(1).join(":")}</span>
        </span>
      );
    }
  }
  return <span style={{ color: humanTheme.codeText }}>{line}</span>;
}

function getExportSyntax(tab: MockRun["result"]["exports"][number]["tab"]): CodeSyntax {
  if (tab === "Design JSON" || tab === "Design Tokens") {
    return "json";
  }

  if (tab === "Tailwind v4" || tab === "CSS Variables") {
    return "css";
  }

  return "markdown";
}

const confidenceStyles: Record<string, string> = {
  high: "border-success bg-successSoft text-success",
  medium: "border-info bg-infoSoft text-info",
  low: "border-danger bg-dangerSoft text-danger",
};

type ProvenanceCardValue = {
  kind: "observed" | "derived" | "synthesized";
  source: "crawl-html" | "crawl-browser" | "gemini" | "derived-rule";
  refs: Array<{
    pageRole: string;
    selector?: string;
  }>;
  fallbackReason?: string;
};

function formatProvenanceSource(source: ProvenanceCardValue["source"]): string {
  switch (source) {
    case "crawl-html":
      return "HTML";
    case "crawl-browser":
      return "Browser";
    case "gemini":
      return "Gemini";
    case "derived-rule":
      return "Rule";
    default:
      return source;
  }
}

function formatProvenanceEvidence(item: ProvenanceCardValue): string {
  const refSummary =
    item.refs.length > 0
      ? item.refs
          .slice(0, 2)
          .map((ref) => ref.selector ?? ref.pageRole)
          .join(" · ")
      : "summary only";

  return `Evidence: ${refSummary}${item.fallbackReason ? ` · ${item.fallbackReason}` : ""}`;
}

function ProvenanceMeta({
  item,
  align = "start",
  dataTestId,
}: {
  item: ProvenanceCardValue;
  align?: "start" | "end";
  dataTestId?: string;
}) {
  const tooltipId = useId();
  const sourceLabel = `Source: ${formatProvenanceSource(item.source)}`;
  const evidenceLabel = formatProvenanceEvidence(item);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);

  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || typeof window === "undefined") {
      return;
    }

    const viewportPadding = 12;
    const offset = 8;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const maxWidth = Math.min(window.innerWidth - viewportPadding * 2, 360);
    const desiredLeft = align === "end" ? triggerRect.right - tooltipRect.width : triggerRect.left;
    const safeMaxLeft = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
    const left = clamp(desiredLeft, viewportPadding, safeMaxLeft);
    const top = Math.max(viewportPadding, triggerRect.top - tooltipRect.height - offset);

    setTooltipStyle({
      left,
      maxWidth,
      position: "fixed",
      top,
      zIndex: 80,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateTooltipPosition();
  }, [isOpen, updateTooltipPosition]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const handleViewportChange = () => {
      updateTooltipPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updateTooltipPosition]);

  return (
    <div
      data-testid={dataTestId}
      className={`relative ${align === "end" ? "text-left sm:text-right" : ""}`.trim()}
    >
      <span
        ref={triggerRef}
        aria-describedby={isOpen ? tooltipId : undefined}
        className="group/source relative inline-flex cursor-default items-center rounded-full border border-borderStrong bg-panelAlt px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors duration-150 hover:border-info/50 hover:bg-accentSoft hover:text-text focus-within:border-info/50 focus-within:bg-accentSoft focus-within:text-text"
        onBlur={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        tabIndex={0}
      >
        <span>{sourceLabel}</span>
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none whitespace-nowrap rounded-[8px] border border-borderStrong bg-panel px-2.5 py-2 text-[11px] normal-case leading-5 text-text shadow-panel"
              style={tooltipStyle ?? { position: "fixed", top: 12, left: 12, zIndex: 80, visibility: "hidden" }}
            >
              {evidenceLabel}
            </span>,
            document.body
          )
        : null}
    </div>
  );
}

function PanelHeader({
  title,
  provenance,
  meta,
  testId,
  titleClassName = "text-lg font-semibold tracking-[-0.03em]",
}: {
  title: ReactNode;
  provenance: ProvenanceCardValue;
  meta?: string;
  testId?: string;
  titleClassName?: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className={titleClassName} style={{ color: humanTheme.text }}>
          {title}
        </h2>
        {meta ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: humanTheme.textMuted }}>
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 sm:justify-end">
        <ProvenanceMeta item={provenance} align="end" />
      </div>
    </div>
  );
}

const typographySpecimenLetters = ["Aa", "Bb", "Cc", "Dd", "Ee", "Ff", "Gg", "Hh", "Ii", "Jj", "Kk", "Ll", "Mm", "Nn", "Oo", "Pp", "Qq", "Rr", "Ss", "Tt", "Uu", "Vv", "Ww", "Xx", "Yy", "Zz"];
const typographySpecimenNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function parseNumericToken(value: string): number {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function isLightColor(value: string): boolean {
  const hex = value.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function sanitizeRadiusToken(value: string): string | null {
  const token = value.trim();
  if (/^-?\d+(\.\d+)?(px|rem|em|%)$/i.test(token)) return token;
  if (/^var\(.+\)$/.test(token)) return token;
  return null;
}

function extractFontFamilyLabel(family: string): string {
  const firstToken = family.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");

  if (!firstToken) return "System";
  if (firstToken.startsWith("var(")) return "System";
  if (/ui-serif/i.test(firstToken)) return "Serif";
  if (/ui-sans|system-ui/i.test(firstToken)) return "Sans";
  if (/mono/i.test(firstToken)) return "Mono";

  return firstToken;
}

function mixHexColors(base: string, target: string, ratio: number): string {
  const parse = (value: string) => {
    const hex = value.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };

  const source = parse(base);
  const targetRgb = parse(target);

  if (!source || !targetRgb) return base;

  const next = source.map((channel, index) => {
    const mixed = Math.round(channel * (1 - ratio) + targetRgb[index] * ratio);
    return mixed.toString(16).padStart(2, "0");
  });

  return `#${next.join("")}`;
}

function buildColorRamp(base: string): string[] {
  const safeBase = /^#[0-9a-f]{6}$/i.test(base) ? base : "#9CA3AF";

  return [
    mixHexColors(safeBase, "#FFFFFF", 0.92),
    mixHexColors(safeBase, "#FFFFFF", 0.78),
    mixHexColors(safeBase, "#FFFFFF", 0.62),
    mixHexColors(safeBase, "#FFFFFF", 0.42),
    safeBase,
    mixHexColors(safeBase, "#111827", 0.18),
    mixHexColors(safeBase, "#111827", 0.34),
    mixHexColors(safeBase, "#111827", 0.5),
  ];
}

function formatTypographySpecs(token: MockRun["result"]["typography"][number]): string {
  return [
    extractFontFamilyLabel(token.family),
    token.size,
    token.weight ? token.weight : null,
    token.lineHeight ? `${token.lineHeight}` : null,
    token.letterSpacing ? token.letterSpacing : null,
  ].filter(Boolean).join(" / ");
}

function SidebarPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-panel border shadow-panel ${className}`.trim()}
      style={{
        borderColor: humanTheme.border,
        backgroundColor: humanTheme.surface,
      }}
    >
      {children}
    </section>
  );
}

function TypographySystemCard({ run }: { run: MockRun }) {
  const typography = run.result.typography;
  const displayToken = typography[0];
  const bodyToken = typography[1] ?? typography[0];
  const displayFamilyLabel = extractFontFamilyLabel(displayToken?.family ?? "");

  return (
    <SidebarPanel>
      <div data-testid="typography-card-layout" className="grid gap-px" style={{ backgroundColor: humanTheme.border }}>
        <div className="p-4" style={{ backgroundColor: humanTheme.surfaceStrong, color: humanTheme.text }}>
          <PanelHeader
            title="Typography"
            provenance={run.result.observed.typography}
            testId="typography-card-header"
            titleClassName="text-lg font-semibold tracking-[-0.04em]"
          />

          {typography.length > 0 ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: humanTheme.textSoft }}>Heading system</p>
                  <p className="mt-2 max-w-[24ch] text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>{formatTypographySpecs(displayToken)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: humanTheme.textSoft }}>Body system</p>
                  <p className="mt-2 max-w-[24ch] text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>{formatTypographySpecs(bodyToken)}</p>
                </div>
              </div>

              <p
                className="mt-6 text-[clamp(1.7rem,4vw,2.2rem)] font-semibold leading-none tracking-[-0.05em]"
                style={{ fontFamily: displayToken?.family }}
              >
                {displayFamilyLabel}
              </p>
            </>
          ) : (
            <p className="mt-4 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>No typography tokens were extracted from this run yet.</p>
          )}
        </div>

        <aside className="space-y-5 p-4" style={{ backgroundColor: humanTheme.surfaceContrast, color: humanTheme.textSoft }}>
          <div>
            <p className="text-sm font-semibold">Letters</p>
            <div
              data-testid="typography-letters-grid"
              className="mt-3 grid grid-cols-7 gap-x-2 gap-y-2 text-center text-base font-semibold tracking-[-0.03em] md:text-sm"
              style={{ fontFamily: displayToken?.family }}
            >
              {typographySpecimenLetters.map((specimen) => (
                <span key={specimen}>{specimen}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Numbers</p>
            <div
              data-testid="typography-numbers-grid"
              className="mt-3 grid grid-cols-10 gap-x-2 gap-y-2 text-center text-base font-semibold tracking-[-0.03em] md:text-sm"
              style={{ fontFamily: bodyToken?.family }}
            >
              {typographySpecimenNumbers.map((specimen) => (
                <span key={specimen}>{specimen}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </SidebarPanel>
  );
}

function ColorSystemsCard({ run }: { run: MockRun }) {
  const paletteCards = [
    run.result.palette[0] ?? { name: "Primary", value: "#315EE7", role: "Primary actions" },
    run.result.palette[1] ?? { name: "Secondary", value: "#64748B", role: "Secondary surfaces" },
    run.result.palette[2] ?? { name: "Tertiary", value: "#CBD5E1", role: "Support surfaces" },
    run.result.palette.find((token) => isLightColor(token.value)) ?? { name: "Neutral", value: "#FFFFFF", role: "Canvas" },
  ];

  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader
        title="Colors"
        provenance={run.result.observed.palette}
        titleClassName="text-lg font-semibold tracking-[-0.04em]"
      />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {paletteCards.map((token, index) => {
          const toneLabel = index === 0 ? "Primary" : index === 1 ? "Secondary" : index === 2 ? "Tertiary" : "Neutral";
          const textColor = isLightColor(token.value) ? "#1f2937" : "#ffffff";
          const ramp = buildColorRamp(token.value);

          return (
            <article
              key={`${toneLabel}-${token.name}`}
              className="overflow-hidden rounded-[10px] border"
              style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surface }}
            >
              <div className="p-3.5" style={{ backgroundColor: token.value, color: textColor }}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-base font-semibold tracking-[-0.03em] md:text-sm">{toneLabel}</p>
                  <p className="text-[11px] font-semibold tracking-[-0.02em]">{token.value}</p>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-0 border-t" style={{ borderColor: humanTheme.borderStrong }}>
                {ramp.map((swatch, swatchIndex) => (
                  <span key={`${token.name}-${swatchIndex}`} className="h-12" style={{ backgroundColor: swatch }} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </SidebarPanel>
  );
}

function VisualDnaCard({ run }: { run: MockRun }) {
  const visualDna = run.result.derived.visualDna.value;
  const metrics = visualDna.metrics;
  const meta = visualDna.meta;

  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title="Visual DNA" meta={meta} provenance={run.result.derived.visualDna} />

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {metrics.map((item) => (
          <article
            key={item.label}
            className="rounded-[10px] border p-3.5"
            style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surfaceSoft }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>{item.label}</p>
            <p className="mt-1.5 text-base font-semibold tracking-[-0.03em] md:text-sm" style={{ color: humanTheme.text }}>{item.value}</p>
          </article>
        ))}
      </div>
    </SidebarPanel>
  );
}

function PreviewSurface({
  label,
  title,
  accentColor,
  primaryColor,
  displayFamily,
}: {
  label: string;
  title: string;
  accentColor: string;
  primaryColor: string;
  displayFamily: string | undefined;
}) {
  if (label.includes("logo")) {
    return (
      <div className="flex h-24 items-center justify-center rounded-[10px] border border-borderStrong bg-panelSoft">
        <span className="text-xl font-semibold tracking-[-0.04em]" style={{ color: primaryColor, fontFamily: displayFamily }}>
          {title}
        </span>
      </div>
    );
  }

  if (label.includes("hero") || label.includes("heading")) {
    return (
      <div className="rounded-[10px] border border-borderStrong bg-panelSoft p-4">
        <p className="max-w-[14ch] text-xl font-semibold leading-[1.05] tracking-[-0.04em] text-text" style={{ fontFamily: displayFamily }}>
          {title}
        </p>
        <div className="mt-4 h-px bg-borderStrong" />
        <div className="mt-3 flex gap-2">
          <span className="h-2 w-12 rounded-full bg-text" />
          <span className="h-2 w-20 rounded-full bg-borderStrong" />
        </div>
      </div>
    );
  }

  if (label.includes("cta") || label.includes("button")) {
    return (
      <div className="rounded-[10px] border border-borderStrong bg-panelSoft p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-[8px] px-3.5 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: humanTheme.accent }}>
            Primary
          </span>
          <span className="inline-flex rounded-[8px] border px-3.5 py-1.5 text-sm font-semibold" style={{ borderColor: humanTheme.borderStrong, color: humanTheme.text }}>
            Secondary
          </span>
          <span className="text-sm font-semibold underline decoration-2 underline-offset-4" style={{ color: accentColor }}>
            Link
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-borderStrong bg-panelSoft p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="h-2.5 w-20 rounded-full bg-borderStrong" />
      </div>
      <div className="mt-4 space-y-2.5">
        <span className="block h-3 rounded-full bg-text" />
        <span className="block h-3 rounded-full bg-borderStrong" />
        <span className="block h-3 w-4/5 rounded-full bg-borderStrong" />
      </div>
    </div>
  );
}

function ComponentLanguageCard({ run }: { run: MockRun }) {
  const primaryColor = run.result.palette[0]?.value ?? "#191C1F";
  const accentColor = run.result.palette[3]?.value ?? run.result.palette[1]?.value ?? primaryColor;
  const displayFamily = run.result.typography[0]?.family;

  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader
        title="Components"
        meta={`${run.result.componentPreviews.length} types`}
        provenance={run.result.derived.componentLanguage}
      />

      {run.result.componentPreviews.length > 0 ? (
        <div data-testid="component-language-list" className="mt-3 grid gap-2.5">
          {run.result.componentPreviews.map((preview) => {
            const label = preview.label.toLowerCase();

            return (
              <article
                key={preview.label}
                className="rounded-[10px] border p-3.5"
                style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surface }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.textMuted }}>{preview.label}</p>
                <div className="mt-3">
                  <PreviewSurface
                    accentColor={accentColor}
                    displayFamily={displayFamily}
                    label={label}
                    primaryColor={primaryColor}
                    title={run.result.site.title}
                  />
                </div>
                <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>{stripHtml(preview.detail)}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>No component previews were extracted from this run yet.</p>
      )}
    </SidebarPanel>
  );
}

function UsageGuidelinesCard({ run }: { run: MockRun }) {
  const guidelines = run.result.synthesis.guidelines.value;

  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title="Guidelines" provenance={run.result.synthesis.guidelines} />

      <div data-testid="usage-guidelines-list" className="mt-3 grid gap-2.5">
        <div
          className="rounded-[10px] border p-3.5"
          style={{
            borderColor: humanTheme.success,
            backgroundColor: humanTheme.successSoft,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.success }}>Do</p>
          {guidelines.dos.length > 0 ? (
            <ul className="mt-3 space-y-2.5 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.success }}>
              {guidelines.dos.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.success }}>No synthesized guidance is available for this run yet.</p>
          )}
        </div>

        <div
          className="rounded-[10px] border p-3.5"
          style={{
            borderColor: humanTheme.danger,
            backgroundColor: humanTheme.dangerSoft,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.danger }}>Don&apos;t</p>
          {guidelines.donts.length > 0 ? (
            <ul className="mt-3 space-y-2.5 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.danger }}>
              {guidelines.donts.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.danger }}>No synthesized cautions are available for this run yet.</p>
          )}
        </div>
      </div>
    </SidebarPanel>
  );
}

function DerivedMetricGrid({ metrics }: { metrics: DerivedDesignSystemSection["metrics"] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {metrics.map((metric) => (
        <article
          key={`${metric.label}-${metric.value}`}
          className="rounded-[10px] border p-3.5"
          style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surfaceSoft }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
            {metric.label}
          </p>
          <p className="mt-1.5 text-base font-semibold tracking-[-0.03em] md:text-sm" style={{ color: humanTheme.text }}>
            {metric.value}
          </p>
        </article>
      ))}
    </div>
  );
}

function ButtonsInferenceCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title={section.title} meta={section.meta} provenance={provenance} testId="buttons-card-header" />

      <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
        {section.summary}
      </p>

      {section.showcase ? (
        <div
          className="mt-4 rounded-[10px] border p-4"
          style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surface }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
            {section.showcase.eyebrow}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em]" style={{ color: humanTheme.text }}>
            {section.showcase.title}
          </p>
          <p className="mt-2 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
            {section.showcase.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-[8px] bg-accent px-4 py-2 text-sm font-semibold text-white">
              {section.showcase.cta ?? "Primary action"}
            </span>
            <span
              className="inline-flex rounded-[8px] border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: humanTheme.borderStrong, color: humanTheme.text }}
            >
              Secondary
            </span>
          </div>
          {section.showcase.note ? (
            <p className="mt-3 text-[11px] leading-5" style={{ color: humanTheme.textMuted }}>
              {section.showcase.note}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <DerivedMetricGrid metrics={section.metrics} />
      </div>
    </SidebarPanel>
  );
}

function IconsInferenceCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  const iconTokens = ["◯", "⌁", "△", "□", "✦"];
  const displaySamples: Array<{ label: string; svg?: string; token?: string }> =
    section.iconSamples && section.iconSamples.length > 0
      ? section.iconSamples
      : iconTokens.map((token, index) => ({
          label: `Fallback icon ${index + 1}`,
          token,
        }));

  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title={section.title} meta={section.meta} provenance={provenance} />

      <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
        {section.summary}
      </p>

      <div data-testid="icons-card-samples" className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {displaySamples.map((sample, index) => (
          <div
            key={sample.label}
            className="grid h-12 place-items-center rounded-[10px] border"
            style={{
              borderColor: humanTheme.borderStrong,
              backgroundColor: index === 0 ? humanTheme.accentSoft : humanTheme.surface,
            }}
          >
            {"svg" in sample && sample.svg ? (
              <img
                alt={`${sample.label} icon sample`}
                className="h-5 w-5"
                src={svgToDataUri(sample.svg)}
              />
            ) : (
              <span
                aria-hidden="true"
                className={`font-semibold ${index === 0 ? "text-xl" : "text-base"}`}
                style={{ color: index === 0 ? humanTheme.accent : humanTheme.textMuted }}
              >
                {sample.token ?? "◯"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <DerivedMetricGrid metrics={section.metrics} />
      </div>
    </SidebarPanel>
  );
}

function SpacingInferenceCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title={section.title} meta={section.meta} provenance={provenance} />

      <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
        {section.summary}
      </p>

      <div
        className="mt-4 rounded-[10px] border p-4"
        style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surfaceSoft }}
      >
        <div className="grid gap-4 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_18%,rgba(49,94,231,0.08)_18%,rgba(49,94,231,0.08)_19%,transparent_19%,transparent_36%)]">
          {section.groups?.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
                {group.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.values.map((value) => (
                  <span
                    key={`${group.label}-${value}`}
                    className="rounded-[8px] border bg-panel px-3 py-2 text-base font-semibold md:text-sm"
                    style={{ borderColor: humanTheme.borderStrong, color: humanTheme.text }}
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <DerivedMetricGrid metrics={section.metrics} />
      </div>
    </SidebarPanel>
  );
}

function MaterialInferenceCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title={section.title} meta={section.meta} provenance={provenance} />

      <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
        {section.summary}
      </p>

      {section.callout ? (
        <div
          className="mt-4 rounded-[10px] border p-4"
          style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surfaceSoft }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
              {section.callout.label}
            </p>
            {section.callout.badge ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.textMuted }}>
                {section.callout.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em]" style={{ color: humanTheme.text }}>
            {section.callout.title}
          </p>
          <p className="mt-2 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
            {section.callout.description}
          </p>
        </div>
      ) : null}

      <div
        className="mt-4 rounded-[12px] border p-5 shadow-panel"
        style={{
          borderColor: humanTheme.borderStrong,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241,245,251,0.96))",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
          Material sample
        </p>
        <p className="mt-2 text-xl font-semibold tracking-[-0.03em]" style={{ color: humanTheme.text }}>
          {section.meta}
        </p>
        <p className="mt-2 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
          Border, shadow, and radius treatments are previewed through the inferred surface language.
        </p>
      </div>

      <div className="mt-4">
        <DerivedMetricGrid metrics={section.metrics} />
      </div>
    </SidebarPanel>
  );
}

function NarrativeInferenceCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  return (
    <SidebarPanel className="p-3.5">
      <PanelHeader title={section.title} meta={section.meta} provenance={provenance} testId={`${section.id}-card-header`} />

      <p className="mt-3 text-base leading-6 md:text-sm md:leading-5" style={{ color: humanTheme.textSoft }}>
        {section.summary}
      </p>

      <div className="mt-4">
        <DerivedMetricGrid metrics={section.metrics} />
      </div>
      {section.references && section.references.length > 0 ? (
        <div className="mt-4 space-y-3">
          {section.references.map((reference) => (
            <article
              key={`${section.id}-${reference.label}`}
              className="rounded-[10px] border p-4"
              style={{ borderColor: humanTheme.borderStrong, backgroundColor: humanTheme.surfaceSoft }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.accent }}>
                  {reference.label}
                </p>
                {reference.language ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: humanTheme.textMuted }}>
                    {reference.language}
                  </span>
                ) : null}
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-[10px] border border-borderStrong bg-panel px-3 py-2.5 font-mono text-[11px] leading-5 text-textSoft">
                {reference.content}
              </pre>
            </article>
          ))}
        </div>
      ) : null}
    </SidebarPanel>
  );
}

function InferredDesignSystemSectionCard({
  section,
  provenance,
}: {
  section: DerivedDesignSystemSection;
  provenance: ProvenanceCardValue;
}) {
  switch (section.id) {
    case "buttons":
      return <ButtonsInferenceCard section={section} provenance={provenance} />;
    case "icons":
      return <IconsInferenceCard section={section} provenance={provenance} />;
    case "spacing":
      return <SpacingInferenceCard section={section} provenance={provenance} />;
    case "material":
      return <MaterialInferenceCard section={section} provenance={provenance} />;
    case "motion":
    case "rendering":
      return <NarrativeInferenceCard section={section} provenance={provenance} />;
    default:
      return null;
  }
}

function HumanDesignSystemSidebar({ run }: { run: MockRun }) {
  const inferredDesignSystem = getDerivedDesignSystem(run.result);

  return (
    <div
      data-testid="results-primary-column"
      className="min-w-0 w-full space-y-1 lg:col-span-1 lg:h-full lg:overflow-y-auto lg:pr-1 app-scrollbar"
    >
      <TypographySystemCard run={run} />
      <ColorSystemsCard run={run} />
      <VisualDnaCard run={run} />
      <ComponentLanguageCard run={run} />
      <UsageGuidelinesCard run={run} />
      {inferredDesignSystem.sections.map((section) => (
        <InferredDesignSystemSectionCard key={section.id} section={section} provenance={run.result.derived.sections} />
      ))}
    </div>
  );
}

/* ── Main Component ── */

export function WorkbenchShell({ run, headerNotice }: WorkbenchShellProps) {
  const [activeTab, setActiveTab] = useState(run.result.exports[0].tab);
  const activeExport = useMemo(
    () => run.result.exports.find((item) => item.tab === activeTab) ?? run.result.exports[0],
    [activeTab, run.result.exports]
  );
  const faviconUrl = useMemo(() => {
    try {
      const source = new URL(run.result.site.canonicalUrl);
      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(source.origin)}&sz=64`;
    } catch {
      return "/favicon.ico";
    }
  }, [run.result.site.canonicalUrl]);

  // For code exports, keep original (structured) content; for DESIGN.md strip HTML from partition lines
  const displayContent = useMemo(() => {
    const raw = activeExport.content;
    // Strip only inline HTML tags but preserve markdown structure
    return raw.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, "").trim();
  }, [activeExport.content]);

  const codeLines = useMemo(() => displayContent.split("\n"), [displayContent]);
  const codeLineEntries = useMemo(() => {
    const seen = new Map<string, number>();

    return codeLines.map((line) => {
      const count = (seen.get(line) ?? 0) + 1;
      seen.set(line, count);
      return {
        key: `${line}-${count}`,
        line
      };
    });
  }, [codeLines]);
  const exportSyntax = useMemo(() => getExportSyntax(activeExport.tab), [activeExport.tab]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-2 p-4 lg:h-[100svh] lg:max-h-[100svh] lg:overflow-hidden">
      <div className="space-y-2">
        <div
          data-testid="results-header"
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"
        >
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-muted transition hover:text-text"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </Link>

          <div data-testid="results-site-group" className="flex min-w-0 items-center justify-center gap-4 justify-self-center">
            <img
              data-testid="results-site-favicon"
              src={faviconUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-[8px] border border-border bg-panelAlt"
            />
            <h1
              data-testid="results-site-title"
              className="min-w-0 truncate text-[13px] font-semibold tracking-[-0.02em] text-text"
            >
              {run.result.site.title}
            </h1>
          </div>

          <div className="justify-self-end">
            <ShareButton fallbackUrl={run.result.site.canonicalUrl} />
          </div>
        </div>
        {headerNotice ? <div>{headerNotice}</div> : null}
      </div>

      <div data-testid="results-columns" className="grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        <HumanDesignSystemSidebar run={run} />

        <div
          data-testid="results-secondary-column"
          className="min-w-0 w-full space-y-2 lg:col-span-2 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden"
        >
          <SectionCard
            data-testid="exports-panel"
            className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
            bodyClassName="flex flex-col gap-4 lg:min-h-0 lg:flex-1"
          >
            <div data-testid="results-exports-header" className="flex items-center justify-between gap-4">
              <h2 className="shrink-0 text-lg font-semibold leading-5 tracking-[-0.03em] text-text">Exports</h2>
              <div
                role="tablist"
                aria-label="Export tabs"
                className="flex min-w-0 flex-1 justify-end gap-1.5 overflow-x-auto pb-1"
              >
                {run.result.exports.map((artifact) => (
                  <button
                    data-testid={`export-tab-${artifact.tab}`}
                    key={artifact.tab}
                    type="button"
                    role="tab"
                    aria-selected={artifact.tab === activeTab}
                    onClick={() => setActiveTab(artifact.tab)}
                    className={`shrink-0 rounded-[8px] border px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                      artifact.tab === activeTab
                        ? "border-info bg-accentSoft text-accent"
                        : "border-border bg-panel text-muted hover:text-text"
                    }`}
                  >
                    {artifact.tab}
                  </button>
                ))}
              </div>
            </div>

            <div data-testid="exports-scroll-region" className="relative min-h-[360px] lg:min-h-0 lg:flex-1">
              <div className="absolute right-3 top-3 z-10">
                <CopyButton text={displayContent} />
              </div>
              <pre
                data-testid="exports-code"
                className="app-scrollbar app-scrollbar-dark h-full max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[12px] border p-4 pr-20 font-mono text-[11px] leading-5 lg:min-h-0"
                style={{
                  borderColor: humanTheme.codeBorder,
                  backgroundColor: humanTheme.codeBg,
                  color: humanTheme.codeText,
                }}
              >
                {codeLineEntries.map((entry) => (
                  <div key={entry.key}>
                    <ColoredCodeLine line={entry.line} syntax={exportSyntax} />
                  </div>
                ))}
              </pre>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
