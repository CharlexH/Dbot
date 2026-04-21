import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createFileJobRepository, createJobRecord, deriveJobSnapshot, prepareJobForRetry, prepareJobForCoverageResume } from "@/lib/jobs";
import { fixtureRuns } from "@/lib/mocks";

describe("job lifecycle", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates a queued job record without fixture-derived completion state", () => {
    const createdAt = "2026-04-09T14:30:00.000Z";
    const job = createJobRecord(
      {
        url: "https://revolut.com",
        selectedPresetIds: ["revolut"],
        selectedCategoryIds: ["Fintech"]
      },
      createdAt
    );

    expect(job.status).toBe("queued");
    expect(job.currentStage).toBe("Discover");
    expect(job.result).toBeUndefined();
    expect(job.failureMessage).toBeUndefined();
  });

  it("returns the persisted snapshot state instead of deriving completion from elapsed time", () => {
    const createdAt = "2026-04-09T14:30:00.000Z";
    const job = createJobRecord(
      {
        url: "https://example.com",
        selectedPresetIds: ["linear"],
        selectedCategoryIds: ["Dark"]
      },
      createdAt
    );

    const snapshot = deriveJobSnapshot(job);

    expect(snapshot.job.currentStage).toBe("Discover");
    expect(snapshot.job.status).toBe("queued");
    expect(snapshot.result).toBeUndefined();
  });

  it("persists and reloads jobs by id", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dbot-jobs-"));
    const repository = createFileJobRepository(path.join(tempDir, "jobs.json"));
    const job = createJobRecord(
      {
        url: "https://dbot.dev",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["AI"]
      },
      "2026-04-09T14:30:00.000Z"
    );

    await repository.save(job);
    const loaded = await repository.findById(job.id);

    expect(loaded).toMatchObject({
      id: job.id,
      submittedUrl: "https://dbot.dev"
    });
  });

  it("resets failed jobs back to discover and clears prior artifacts when preparing a retry", () => {
    const job = createJobRecord(
      {
        url: "https://offline.test",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["SaaS"]
      },
      "2026-04-09T14:30:00.000Z"
    );

    job.status = "failed";
    job.currentStage = "Discover";
    job.failureStage = "Discover";
    job.failureMessage = "Discover failed: Request failed with 503";
    job.stages = job.stages.map((stage) =>
      stage.name === "Discover"
        ? {
            ...stage,
            status: "failed",
            startedAt: "2026-04-09T14:31:00.000Z",
            endedAt: "2026-04-09T14:31:01.000Z",
            error: "Discover failed: Request failed with 503"
          }
        : stage
    );

    const retried = prepareJobForRetry(job, "2026-04-09T14:32:00.000Z");

    expect(retried.status).toBe("queued");
    expect(retried.currentStage).toBe("Discover");
    expect(retried.failureStage).toBeUndefined();
    expect(retried.failureMessage).toBeUndefined();
    expect(retried.retryCount).toBe(1);
    expect(retried.lastRetriedAt).toBe("2026-04-09T14:32:00.000Z");
    expect(retried.evidence).toBeUndefined();
    expect(retried.extracted).toBeUndefined();
    expect(retried.result).toBeUndefined();
    expect(retried.stages.map((stage) => `${stage.name}:${stage.status}`)).toEqual([
      "Discover:pending",
      "Partition:pending",
      "Extract:pending",
      "Generate:pending",
      "Validate:pending"
    ]);
  });

  it("restarts from discover when retrying a validate failure", () => {
    const job = createJobRecord(
      {
        url: "https://retry-validate.test",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["SaaS"]
      },
      "2026-04-09T14:30:00.000Z"
    );

    job.status = "failed";
    job.currentStage = "Validate";
    job.failureStage = "Validate";
    job.failureMessage = "Validate failed: export mismatch";
    job.extracted = {
      siteTitle: "Retry Validate",
      vibe: "SaaS product voice with high evidence coverage.",
      narrative: "Narrative",
      tags: ["saas"],
      confidence: "high",
      partitions: [],
      riskLabels: []
    };
    job.result = undefined;
    job.stages = job.stages.map((stage) => {
      if (stage.name === "Generate") {
        return {
          ...stage,
          status: "completed",
          startedAt: "2026-04-09T14:33:00.000Z",
          endedAt: "2026-04-09T14:33:30.000Z",
          message: "Completed",
          error: null
        };
      }

      if (stage.name === "Validate") {
        return {
          ...stage,
          status: "failed",
          startedAt: "2026-04-09T14:34:00.000Z",
          endedAt: "2026-04-09T14:34:10.000Z",
          message: null,
          error: "Validate failed: export mismatch"
        };
      }

      return {
        ...stage,
        status: "completed",
        startedAt: "2026-04-09T14:32:00.000Z",
        endedAt: "2026-04-09T14:32:30.000Z",
        message: "Completed",
        error: null
      };
    });

    const retried = prepareJobForRetry(job, "2026-04-09T14:35:00.000Z");

    expect(retried.status).toBe("queued");
    expect(retried.currentStage).toBe("Discover");
    expect(retried.failureStage).toBeUndefined();
    expect(retried.failureMessage).toBeUndefined();
    expect(retried.retryCount).toBe(1);
    expect(retried.evidence).toBeUndefined();
    expect(retried.extracted).toBeUndefined();
    expect(retried.result).toBeUndefined();
    expect(retried.stages.map((stage) => stage.status)).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
      "pending"
    ]);
  });

  it("resets completed partial-coverage jobs back to discover while preserving successful evidence pages", () => {
    const job = createJobRecord(
      {
        url: "https://resume.test",
        selectedPresetIds: ["intercom"],
        selectedCategoryIds: ["SaaS"]
      },
      "2026-04-09T14:30:00.000Z"
    );

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
    job.result = structuredClone(fixtureRuns.singleExperience.result);
    job.stages = job.stages.map((stage, index) => ({
      ...stage,
      status: "completed",
      startedAt: `2026-04-09T14:3${index}:00.000Z`,
      endedAt: `2026-04-09T14:3${index}:30.000Z`,
      message: "Completed",
      error: null
    }));

    const resumed = prepareJobForCoverageResume(job, "2026-04-09T14:40:00.000Z");

    expect(resumed.status).toBe("queued");
    expect(resumed.currentStage).toBe("Discover");
    expect(resumed.retryCount).toBe(1);
    expect(resumed.lastRetriedAt).toBe("2026-04-09T14:40:00.000Z");
    expect(resumed.evidence?.pages).toHaveLength(1);
    expect(resumed.evidence?.failures).toEqual([{ url: "https://resume.test/docs", reason: "Request failed with 500" }]);
    expect(resumed.extracted).toBeUndefined();
    expect(resumed.result).toBeUndefined();
    expect(resumed.stages.map((stage) => `${stage.name}:${stage.status}`)).toEqual([
      "Discover:pending",
      "Partition:pending",
      "Extract:pending",
      "Generate:pending",
      "Validate:pending"
    ]);
  });
});
