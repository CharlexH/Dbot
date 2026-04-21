import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerationProgressCard } from "@/components/shared/generation-progress-card";
import { createJobRecord } from "@/lib/jobs";
import { JobSnapshot } from "@/types";

function buildRunningSnapshot(): JobSnapshot {
  const job = createJobRecord({
    url: "https://dbot.test",
    selectedPresetIds: ["revolut"],
    selectedCategoryIds: ["Fintech"]
  });

  job.id = "job_card";
  job.status = "running";
  job.currentStage = "Partition";
  job.createdAt = "2026-04-09T15:00:00.000Z";
  job.updatedAt = "2026-04-09T15:01:00.000Z";
  job.stages = job.stages.map((stage) => {
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

  return { job };
}

describe("generation progress card", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a visible progress floor as soon as discover starts", () => {
    const job = createJobRecord({
      url: "https://dbot.test",
      selectedPresetIds: ["revolut"],
      selectedCategoryIds: ["Fintech"]
    });

    job.id = "job_boot";
    job.createdAt = "2026-04-09T15:00:00.000Z";
    job.updatedAt = "2026-04-09T15:00:00.000Z";

    render(<GenerationProgressCard snapshot={{ job }} />);

    expect(screen.getByText("8%")).toBeInTheDocument();
  });

  it("renders a solid white panel and only the current operation copy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T15:01:10.000Z"));

    render(<GenerationProgressCard snapshot={buildRunningSnapshot()} />);

    const card = screen.getByTestId("generation-progress-card");
    const operation = screen.getByTestId("generation-current-operation");

    expect(card).toHaveClass("bg-panel");
    expect(card).not.toHaveClass("backdrop-blur");
    expect(screen.queryByText(/live run/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/task timer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/current operation/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("generation-progress-actions")).not.toBeInTheDocument();
    expect(operation).toHaveTextContent("Partition · Grouping page structure.");
    expect(screen.queryByText("Collected 1 same-origin page.")).not.toBeInTheDocument();
  });
});
