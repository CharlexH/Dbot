import { render, screen } from "@testing-library/react";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResultsPage from "@/app/results/[jobId]/page";
import { createFileJobRepository, createJobRecord } from "@/lib/jobs";
import { fixtureRuns } from "@/lib/mocks";
import { ResultRecord } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

function buildResultRecord(): ResultRecord {
  return structuredClone(fixtureRuns.singleExperience.result);
}

describe("results page direct load", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dbot-results-page-"));
    process.env.DBOT_RUNTIME_FILE = path.join(tempDir, "jobs.json");
  });

  afterEach(async () => {
    delete process.env.DBOT_RUNTIME_FILE;
    vi.useRealTimers();
    pushMock.mockReset();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("renders a completed job by id on direct load", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T15:00:00.000Z"));

    const repository = createFileJobRepository(process.env.DBOT_RUNTIME_FILE!);
    const job = createJobRecord(
      {
        url: "https://revolut.com",
        selectedPresetIds: ["revolut"],
        selectedCategoryIds: ["Fintech"]
      },
      "2026-04-09T15:00:00.000Z"
    );
    job.status = "completed";
    job.currentStage = "Validate";
    job.result = buildResultRecord();
    job.stages = job.stages.map((stage, index) => ({
      ...stage,
      status: "completed",
      startedAt: `2026-04-09T15:0${index}:00.000Z`,
      endedAt: `2026-04-09T15:0${index}:30.000Z`,
      message: "Completed",
      error: null
    }));
    await repository.save(job);

    const page = await ResultsPage({ params: { jobId: job.id } });
    render(page);

    expect(screen.getByTestId("results-share-button")).toBeInTheDocument();
    expect(screen.queryByTestId("results-status-badge")).not.toBeInTheDocument();
  });

  it("renders the shared progress experience for in-flight jobs loaded directly by id", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T15:00:00.000Z"));

    const repository = createFileJobRepository(process.env.DBOT_RUNTIME_FILE!);
    const job = createJobRecord(
      {
        url: "https://revolut.com",
        selectedPresetIds: ["revolut"],
        selectedCategoryIds: ["Fintech"]
      },
      "2026-04-09T15:00:00.000Z"
    );
    job.status = "running";
    job.currentStage = "Partition";
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
          message: "Stage in progress.",
          error: null
        };
      }

      return stage;
    });
    await repository.save(job);

    const page = await ResultsPage({ params: { jobId: job.id } });
    render(page);

    expect(screen.getByTestId("generation-progress-card")).toBeInTheDocument();
    expect(screen.getByText("2/5 · 整理页面结构与范围")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /generating design\.md/i })).not.toBeInTheDocument();
  });
});
