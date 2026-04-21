import { describe, expect, it } from "vitest";
import { shouldApplyProgressSnapshot } from "@/lib/generation-progress";
import { createJobRecord } from "@/lib/jobs";
import { JobSnapshot, JobStageName } from "@/types";

function buildSnapshot(stageName: JobStageName, updatedAt: string): JobSnapshot {
  const job = createJobRecord({
    url: "https://dbot.test",
    selectedPresetIds: ["revolut"],
    selectedCategoryIds: ["Fintech"]
  });

  job.id = "job_poll";
  job.status = stageName === "Validate" ? "completed" : "running";
  job.currentStage = stageName;
  job.updatedAt = updatedAt;
  job.stages = job.stages.map((stage) => {
    const stageIndex = ["Discover", "Partition", "Extract", "Generate", "Validate"].indexOf(stage.name);
    const currentIndex = ["Discover", "Partition", "Extract", "Generate", "Validate"].indexOf(stageName);
    const isCompleted = stageIndex < currentIndex || (stageName === "Validate" && stageIndex <= currentIndex);
    const isCurrent = stageIndex === currentIndex;

    return {
      ...stage,
      status: isCompleted ? "completed" : isCurrent ? "running" : "pending",
      startedAt: isCompleted || isCurrent ? "2026-04-09T15:00:00.000Z" : null,
      endedAt: isCompleted ? "2026-04-09T15:00:30.000Z" : null,
      message: isCompleted || isCurrent ? `${stage.name} in progress.` : null,
      error: null
    };
  });

  return { job };
}

describe("shouldApplyProgressSnapshot", () => {
  it("accepts the first snapshot when there is no current state", () => {
    expect(shouldApplyProgressSnapshot(null, buildSnapshot("Discover", "2026-04-09T15:00:00.000Z"))).toBe(true);
  });

  it("rejects an older snapshot that would move progress backwards", () => {
    const current = buildSnapshot("Generate", "2026-04-09T15:03:00.000Z");
    const stale = buildSnapshot("Partition", "2026-04-09T15:02:00.000Z");

    expect(shouldApplyProgressSnapshot(current, stale)).toBe(false);
  });

  it("accepts a newer retry snapshot even when progress restarts from discover", () => {
    const current = buildSnapshot("Extract", "2026-04-09T15:02:00.000Z");
    const retry = buildSnapshot("Discover", "2026-04-09T15:03:00.000Z");
    retry.job.status = "queued";

    expect(shouldApplyProgressSnapshot(current, retry)).toBe(true);
  });

  it("falls back to stage progress when timestamps are tied", () => {
    const current = buildSnapshot("Partition", "2026-04-09T15:02:00.000Z");
    const advanced = buildSnapshot("Extract", "2026-04-09T15:02:00.000Z");
    const stale = buildSnapshot("Discover", "2026-04-09T15:02:00.000Z");

    expect(shouldApplyProgressSnapshot(current, advanced)).toBe(true);
    expect(shouldApplyProgressSnapshot(current, stale)).toBe(false);
  });
});
