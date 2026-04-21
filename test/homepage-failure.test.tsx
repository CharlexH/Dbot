import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function buildFailedSnapshot(jobId = "job_failed"): JobSnapshot {
  const job = createJobRecord(
    {
      url: "https://dbot.test",
      selectedPresetIds: ["revolut"],
      selectedCategoryIds: ["Fintech"]
    },
    "2026-04-09T15:00:00.000Z"
  );

  job.id = jobId;
  job.status = "failed";
  job.currentStage = "Discover";
  job.failureStage = "Discover";
  job.failureMessage = "Discover failed: Request failed with 503";
  job.stages = job.stages.map((stage) =>
    stage.name === "Discover"
      ? {
          ...stage,
          status: "failed",
          startedAt: "2026-04-09T15:00:00.000Z",
          endedAt: "2026-04-09T15:00:10.000Z",
          message: null,
          error: "Discover failed: Request failed with 503"
        }
      : stage
  );

  return { job };
}

describe("homepage failure escape hatch", () => {
  beforeEach(() => {
    vi.useRealTimers();
    pushMock.mockReset();
    window.sessionStorage.clear();
  });

  it("lets the user return to the homepage hero from a failed restored run", async () => {
    const failedSnapshot = buildFailedSnapshot("job_failed");
    window.sessionStorage.setItem(
      HOME_PROGRESS_STORAGE_KEY,
      JSON.stringify({ jobId: "job_failed", resultRoute: "/results/job_failed" })
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => failedSnapshot
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "返回" }));

    expect(screen.getByTestId("homepage-hero-shell")).toHaveAttribute("data-state", "visible");
    expect(screen.queryByTestId("generation-progress-card")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(HOME_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
