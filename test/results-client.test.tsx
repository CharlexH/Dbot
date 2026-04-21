import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultsClient } from "@/components/results/results-client";
import { createJobRecord } from "@/lib/jobs";
import { JobSnapshot, ResultRecord } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("@/components/home/dot-grid-bg", () => ({
  DotGridBg: () => <div data-testid="dot-grid-bg" />
}));

function buildResultRecord(): ResultRecord {
  const site = {
    canonicalUrl: "https://resume.test",
    domain: "resume.test",
    title: "Resume Cloud"
  };
  const brandSummary = {
    title: "Resume Cloud",
    vibe: "SaaS product voice with medium evidence coverage.",
    narrative: "Narrative",
    tags: ["saas"],
    sourceUrl: "https://resume.test"
  };
  const palette = [{ name: "Primary Ink", value: "#111827", role: "Primary interface chrome" }];
  const typography = [
    { name: "Display", family: "ui-serif, Georgia", size: "40px", usage: "Headings", sample: "Resume Cloud" },
    { name: "Body", family: "ui-sans-serif, system-ui", size: "16px", usage: "Body copy", sample: "Operational text" }
  ];
  const guidelines = { dos: ["Keep hierarchy crisp."], donts: ["Over-decorate surfaces."] };
  const exports = [
    { tab: "DESIGN.md" as const, status: "ready" as const, content: "# DESIGN" },
    { tab: "Design JSON" as const, status: "ready" as const, content: "{}" },
    { tab: "Tailwind v4" as const, status: "ready" as const, content: "tailwind" },
    { tab: "CSS Variables" as const, status: "ready" as const, content: ":root {}" },
    { tab: "Design Tokens" as const, status: "ready" as const, content: "{}" }
  ];

  return {
    provenanceVersion: 1,
    site,
    brandSummary,
    palette,
    typography,
    spacing: [],
    shadows: [],
    borderRadii: [],
    derivedDesignSystem: { sections: [] },
    componentPreviews: [{ label: "Hero framing", detail: "Preview" }],
    guidelines,
    exports,
    partitions: [],
    riskLabels: [],
    provenanceWarnings: [],
    includesPartitionAppendix: true,
    observed: {
      evidence: { htmlPages: [], browserPages: [] },
      palette: { kind: "observed", source: "crawl-html", value: palette, refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      typography: { kind: "observed", source: "crawl-html", value: typography, refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      spacing: { kind: "observed", source: "crawl-html", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      shadows: { kind: "observed", source: "crawl-html", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      borderRadii: { kind: "observed", source: "crawl-html", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] }
    },
    derived: {
      brand: {
        kind: "derived",
        source: "derived-rule",
        value: { title: brandSummary.title, vibe: brandSummary.vibe, tags: brandSummary.tags, sourceUrl: brandSummary.sourceUrl },
        refs: [{ url: site.canonicalUrl, pageRole: "root" }]
      },
      visualDna: {
        kind: "derived",
        source: "derived-rule",
        value: { meta: "resume", metrics: [{ label: "Layout", value: "Single flow" }], tags: ["saas"] },
        refs: [{ url: site.canonicalUrl, pageRole: "root" }]
      },
      componentLanguage: {
        kind: "derived",
        source: "derived-rule",
        value: [{ label: "Hero framing", detail: "Preview" }],
        refs: [{ url: site.canonicalUrl, pageRole: "root" }]
      },
      sections: { kind: "derived", source: "derived-rule", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      partitions: { kind: "derived", source: "derived-rule", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      riskLabels: { kind: "derived", source: "derived-rule", value: [], refs: [{ url: site.canonicalUrl, pageRole: "root" }] }
    },
    synthesis: {
      narrative: { kind: "synthesized", source: "derived-rule", value: brandSummary.narrative, refs: [{ url: site.canonicalUrl, pageRole: "root" }] },
      guidelines: { kind: "synthesized", source: "derived-rule", value: guidelines, refs: [{ url: site.canonicalUrl, pageRole: "root" }] }
    },
    compat: {
      site,
      brandSummary,
      palette,
      typography,
      spacing: [],
      shadows: [],
      borderRadii: [],
      derivedDesignSystem: { sections: [] },
      componentPreviews: [{ label: "Hero framing", detail: "Preview" }],
      guidelines,
      exports,
      partitions: [],
      riskLabels: [],
      provenanceWarnings: [],
      includesPartitionAppendix: true
    }
  };
}

function buildFailedSnapshot(): JobSnapshot {
  const job = createJobRecord({
    url: "https://retry.test",
    selectedPresetIds: ["intercom"],
    selectedCategoryIds: ["SaaS"]
  });

  job.id = "job_retry";
  job.status = "failed";
  job.currentStage = "Discover";
  job.failureStage = "Discover";
  job.failureMessage = "Discover failed: Request failed with 503";
  job.stages = job.stages.map((stage) =>
    stage.name === "Discover"
      ? {
          ...stage,
          status: "failed",
          error: "Discover failed: Request failed with 503",
          endedAt: "2026-04-09T16:00:00.000Z"
        }
      : stage
  );

  return { job };
}

function buildCompletedPartialCoverageSnapshot(): JobSnapshot {
  const job = createJobRecord({
    url: "https://resume.test",
    selectedPresetIds: ["intercom"],
    selectedCategoryIds: ["SaaS"]
  });

  job.id = "job_resume";
  job.status = "completed";
  job.currentStage = "Validate";
  job.evidence = {
    pages: [
      {
        url: "https://resume.test",
        title: "Resume Cloud",
        headings: ["Resume Cloud"],
        description: null,
        textSnippets: ["Primary page"]
      }
    ],
    failures: [{ url: "https://resume.test/docs", reason: "Request failed with 500" }]
  };
  job.stages = job.stages.map((stage) => ({
    ...stage,
    status: "completed",
    startedAt: "2026-04-09T16:00:00.000Z",
    endedAt: "2026-04-09T16:00:30.000Z",
    message: "Completed",
    error: null
  }));

  return {
    job,
    result: buildResultRecord()
  };
}

describe("results client retry affordance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockReset();
  });

  it("offers retry for failed jobs and re-enters the running lifecycle on click", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          ...buildFailedSnapshot().job,
          status: "running",
          currentStage: "Partition",
          failureStage: undefined,
          failureMessage: undefined,
          retryCount: 1,
          stages: buildFailedSnapshot().job.stages.map((stage) =>
            stage.name === "Discover"
              ? {
                  ...stage,
                  status: "completed",
                  error: null,
                  message: "Collected 1 same-origin page."
                }
              : stage
          )
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ResultsClient initialSnapshot={buildFailedSnapshot()} jobId="job_retry" />);

    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job_retry?retry=1", { cache: "no-store" });
    });

    await waitFor(() => {
      expect(screen.getByText("2/5 · 整理页面结构与范围")).toBeInTheDocument();
      expect(screen.getByText("20%")).toBeInTheDocument();
    });
  });

  it("offers coverage resume for completed jobs with crawl failures", async () => {
    const user = userEvent.setup();
    const resumedSnapshot = buildCompletedPartialCoverageSnapshot();
    resumedSnapshot.job.status = "queued";
    resumedSnapshot.job.currentStage = "Discover";
    resumedSnapshot.job.retryCount = 1;
    resumedSnapshot.job.lastRetriedAt = "2026-04-09T16:01:00.000Z";
    resumedSnapshot.job.stages = resumedSnapshot.job.stages.map((stage) => ({
      ...stage,
      status: "pending",
      startedAt: null,
      endedAt: null,
      message: null,
      error: null
    }));
    resumedSnapshot.result = undefined;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => resumedSnapshot
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<ResultsClient initialSnapshot={buildCompletedPartialCoverageSnapshot()} jobId="job_resume" />);

    const resumeButton = screen.getByRole("button", { name: /resume coverage/i });
    const coverageNotice = screen.getByText(/partial crawl coverage detected/i).closest("div");

    expect(resumeButton).toBeInTheDocument();
    expect(coverageNotice).toHaveClass("border-info");
    expect(coverageNotice).toHaveClass("bg-infoSoft");
    expect(coverageNotice).toHaveClass("text-info");

    await user.click(resumeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job_resume?retry=1", { cache: "no-store" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("generation-progress-card")).toBeInTheDocument();
      expect(screen.getByText("1/5 · 扫描同源页面与证据")).toBeInTheDocument();
      expect(screen.getByText("8%")).toBeInTheDocument();
    });
  }, 10000);

  it("renders retry failures with cold error styling instead of warning amber", () => {
    render(<ResultsClient initialSnapshot={buildFailedSnapshot()} jobId="job_retry" />);

    const failureMessage = screen.getByTestId("generation-current-operation");

    expect(failureMessage).toHaveClass("text-danger");
    expect(failureMessage).not.toHaveClass("text-warning");
  });

  it("offers a back action for failed jobs so the user can leave the retry loop", async () => {
    const user = userEvent.setup();

    render(<ResultsClient initialSnapshot={buildFailedSnapshot()} jobId="job_retry" />);

    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回" }));

    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("renders completed results as a single-screen workspace with share and scroll affordances", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    });
    window.history.replaceState({}, "", "http://localhost:3000/results/job_resume");

    render(<ResultsClient initialSnapshot={buildCompletedPartialCoverageSnapshot()} jobId="job_resume" />);

    expect(screen.queryByText(/agent-ready output/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("results-site-title")).toHaveClass("text-[13px]");
    expect(screen.getByTestId("results-site-group")).toHaveClass("gap-4");
    expect(screen.queryByTestId("results-site-summary")).not.toBeInTheDocument();
    expect(screen.queryByTestId("results-status-badge")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toBeInTheDocument();

    const shareButton = screen.getByTestId("results-share-button");
    const exportTabs = screen.getByRole("tablist", { name: "Export tabs" });
    const exportHeader = screen.getByTestId("results-exports-header");
    const exportsPanel = screen.getByTestId("exports-panel");
    const exportScrollRegion = screen.getByTestId("exports-scroll-region");
    const exportCode = screen.getByTestId("exports-code");
    const primaryColumn = screen.getByTestId("results-primary-column");
    const typographyLettersGrid = screen.getByTestId("typography-letters-grid");
    const typographyNumbersGrid = screen.getByTestId("typography-numbers-grid");
    const sourceLabels = screen.getAllByText(/source:/i);

    expect(shareButton).toBeInTheDocument();
    expect(exportHeader).toHaveClass("justify-between");
    expect(exportTabs).toHaveClass("justify-end");
    expect(exportTabs).toHaveClass("overflow-x-auto");
    expect(primaryColumn).toHaveClass("app-scrollbar");
    expect(typographyLettersGrid).toHaveClass("grid-cols-7");
    expect(typographyNumbersGrid).toHaveClass("grid-cols-10");
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("01")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Observed$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Derived$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Synthesized$/)).not.toBeInTheDocument();
    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.queryByText("Component Language")).not.toBeInTheDocument();
    expect(screen.getByText("Guidelines")).toBeInTheDocument();
    expect(screen.queryByText("Usage Guidelines")).not.toBeInTheDocument();
    expect(screen.getByText("1 types")).toBeInTheDocument();
    const sourcePill = sourceLabels[0].closest("span[tabindex='0']") as HTMLElement;
    expect(sourceLabels[0]).toHaveTextContent("Source:");
    expect(sourcePill).toHaveClass("rounded-full");
    expect(sourcePill).toHaveClass("bg-panelAlt");
    await user.hover(sourcePill);
    const tooltip = await screen.findByRole("tooltip");
    expect(sourcePill).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Evidence: root");
    expect(tooltip).toHaveClass("whitespace-nowrap");
    expect(exportsPanel).toHaveClass("lg:h-full");
    expect(exportScrollRegion).toHaveClass("lg:flex-1");
    expect(exportCode).toHaveClass("overflow-auto");
    expect(exportCode).toHaveClass("app-scrollbar-dark");

    await user.click(shareButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("http://localhost:3000/results/job_resume");
    });

    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });
});
