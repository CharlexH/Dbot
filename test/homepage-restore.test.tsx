import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { HOME_PROGRESS_STORAGE_KEY } from "@/lib/generation-progress";
import { createJobRecord } from "@/lib/jobs";
import { JobSnapshot } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("@/components/home/dot-grid-bg", () => ({
  DotGridBg: () => <div data-testid="dot-grid-bg" />
}));

vi.mock("@/components/home/url-input-form", () => ({
  UrlInputForm: () => <button type="button">Start mocked job</button>
}));

vi.mock("@/components/shared/use-job-progress-controller", () => ({
  useJobProgressController: ({ initialSnapshot }: { initialSnapshot: JobSnapshot | null }) => ({
    snapshot: initialSnapshot,
    error: null,
    isRetrying: false,
    handleRetry: vi.fn(),
    setSnapshot: vi.fn()
  })
}));

function buildRunningSnapshot(jobId = "job_restore"): JobSnapshot {
  const snapshot = createJobRecord(
    {
      url: "https://dbot.test",
      selectedPresetIds: ["revolut"],
      selectedCategoryIds: ["Fintech"]
    },
    "2026-04-09T15:00:00.000Z"
  );

  snapshot.id = jobId;
  snapshot.status = "running";
  snapshot.currentStage = "Partition";
  snapshot.stages = snapshot.stages.map((stage) => {
    if (stage.name === "Discover") {
      return {
        ...stage,
        status: "completed",
        startedAt: "2026-04-09T15:00:00.000Z",
        endedAt: "2026-04-09T15:00:30.000Z",
        message: "Collected 1 same-origin page.",
        error: null
      };
    }

    if (stage.name === "Partition") {
      return {
        ...stage,
        status: "running",
        startedAt: "2026-04-09T15:00:30.000Z",
        endedAt: null,
        message: "Grouping page structure.",
        error: null
      };
    }

    return stage;
  });

  return { job: snapshot };
}

describe("homepage refresh restore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    pushMock.mockReset();
    window.sessionStorage.clear();
  });

  it("restores an in-flight job from session storage on refresh", async () => {
    const restoredSnapshot = buildRunningSnapshot("job_restore");
    window.sessionStorage.setItem(
      HOME_PROGRESS_STORAGE_KEY,
      JSON.stringify({ jobId: "job_restore", resultRoute: "/results/job_restore" })
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => restoredSnapshot
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job_restore", { cache: "no-store" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("homepage-hero-shell")).toHaveAttribute("data-state", "hidden");
      expect(screen.getByTestId("generation-progress-card")).toBeInTheDocument();
      expect(screen.getByText("2/5 · 整理页面结构与范围")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
