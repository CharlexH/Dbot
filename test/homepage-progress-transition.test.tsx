import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { createJobRecord } from "@/lib/jobs";
import { CreateJobResponse, JobSnapshot } from "@/types";

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
  UrlInputForm: ({ onJobCreated }: { onJobCreated?: (payload: CreateJobResponse) => void }) => (
    <button
      type="button"
      onClick={() => {
        const job = createJobRecord({
          url: "https://dbot.test",
          selectedPresetIds: ["revolut"],
          selectedCategoryIds: ["Fintech"]
        });

        job.id = "job_home_progress";
        onJobCreated?.({
          jobId: job.id,
          route: `/results/${job.id}`,
          snapshot: { job }
        });
      }}
    >
      Start mocked job
    </button>
  )
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

describe("homepage progress transition", () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.sessionStorage.clear();
  });

  it("shows the progress card immediately after a job starts", async () => {
    const user = userEvent.setup();

    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: /start mocked job/i }));

    expect(screen.getByTestId("homepage-progress-shell")).toHaveAttribute("data-state", "visible");
    expect(screen.getByTestId("generation-progress-card")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-hero-shell")).toHaveAttribute("data-state", "exiting");
  });
});
