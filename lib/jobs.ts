import fs from "node:fs/promises";
import path from "node:path";
import { restartCoverageJobFromDiscover, restartFailedJobFromDiscover } from "@/lib/generation-progress";
import { GenerateRequestPayload, JobRecord, JobSnapshot, JOB_STAGES, JobStage } from "@/types";

interface PersistedJobStore {
  jobs: JobRecord[];
}

export interface FileJobRepository {
  save: (job: JobRecord) => Promise<void>;
  findById: (jobId: string) => Promise<JobRecord | undefined>;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createJobRecord(payload: GenerateRequestPayload, createdAt = new Date().toISOString()): JobRecord {
  return {
    id: uid("job"),
    submittedUrl: payload.url,
    selectedPresetIds: payload.selectedPresetIds,
    selectedCategoryIds: payload.selectedCategoryIds,
    geminiApiKey: payload.geminiApiKey,
    geminiModel: payload.geminiModel,
    status: "queued",
    currentStage: "Discover",
    createdAt,
    updatedAt: createdAt,
    stages: JOB_STAGES.map((name) => ({
      name,
      status: "pending",
      startedAt: null,
      endedAt: null,
      message: null,
      error: null
    }))
  };
}

export function deriveJobSnapshot(job: JobRecord): JobSnapshot {
  return {
    job,
    result: job.result
  };
}

export function prepareJobForRetry(job: JobRecord, nowIso = new Date().toISOString()): JobRecord {
  return restartFailedJobFromDiscover(job, nowIso);
}

export function prepareJobForCoverageResume(job: JobRecord, nowIso = new Date().toISOString()): JobRecord {
  return restartCoverageJobFromDiscover(job, nowIso);
}

async function readStore(filePath: string): Promise<PersistedJobStore> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedJobStore;
    return { jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

async function writeStore(filePath: string, store: PersistedJobStore): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2));
}

export function createFileJobRepository(filePath: string): FileJobRepository {
  return {
    async save(job) {
      const store = await readStore(filePath);
      const nextJobs = store.jobs.filter((item) => item.id !== job.id);
      nextJobs.push(job);
      await writeStore(filePath, { jobs: nextJobs });
    },
    async findById(jobId) {
      const store = await readStore(filePath);
      return store.jobs.find((job) => job.id === jobId);
    }
  };
}

export function getJobRepository(): FileJobRepository {
  const runtimeFile = process.env.DBOT_RUNTIME_FILE ?? path.join(process.cwd(), "data", "runtime", "jobs.json");
  return createFileJobRepository(runtimeFile);
}
