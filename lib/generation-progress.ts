import { JOB_STAGES, JobRecord, JobSnapshot, JobStage, JobStageName } from "@/types";

export const HOME_PROGRESS_STORAGE_KEY = "dbot:home-active-job";

interface GenerationStageMeta {
  description: string;
  headlinePool: string[];
  placeholder: string;
}

export interface GenerationLogItem {
  id: string;
  label: JobStageName;
  message: string;
  tone: "default" | "active" | "danger" | "success";
}

const GENERATION_STAGE_META: Record<JobStageName, GenerationStageMeta> = {
  Discover: {
    description: "扫描同源页面与证据",
    headlinePool: ["正在摸底", "先看一圈", "把轮廓捞出来"],
    placeholder: "准备扫描同源页面与证据"
  },
  Partition: {
    description: "整理页面结构与范围",
    headlinePool: ["归归类", "把线索排开", "先把版面拆清楚"],
    placeholder: "准备整理页面结构与范围"
  },
  Extract: {
    description: "提炼品牌信号与设计线索",
    headlinePool: ["提取中", "把气质拎出来", "再往深处看一眼"],
    placeholder: "准备提炼品牌信号与设计线索"
  },
  Generate: {
    description: "组装 DESIGN.md 与导出内容",
    headlinePool: ["开始成稿", "往 DESIGN.md 里落", "把结构搭起来"],
    placeholder: "准备组装 DESIGN.md 与导出内容"
  },
  Validate: {
    description: "校验导出与最终置信度",
    headlinePool: ["收个尾", "最后对一遍", "准备交付"],
    placeholder: "准备校验导出与最终置信度"
  }
};

const FAILED_HEADLINE = ["这一步卡住了"];
const SUCCESS_HEADLINE = ["好了，马上到结果"];
const MIN_DISCOVER_PROGRESS_PERCENT = 8;

function resetStages(stages: JobStage[]): JobStage[] {
  return stages.map((stage) => ({
    ...stage,
    status: "pending",
    startedAt: null,
    endedAt: null,
    message: null,
    error: null
  }));
}

export function getAttemptStartedAt(job: JobRecord): string {
  return job.lastRetriedAt ?? job.createdAt;
}

export function getStageIndex(stageName: JobStageName): number {
  const index = JOB_STAGES.indexOf(stageName);
  return index >= 0 ? index : 0;
}

export function getStageSubtitle(stageName: JobStageName): string {
  const stageIndex = getStageIndex(stageName) + 1;
  return `${stageIndex}/${JOB_STAGES.length} · ${GENERATION_STAGE_META[stageName].description}`;
}

export function getHeadlinePool(snapshot: JobSnapshot): string[] {
  if (snapshot.result && snapshot.job.status === "completed") {
    return SUCCESS_HEADLINE;
  }

  if (snapshot.job.status === "failed") {
    return FAILED_HEADLINE;
  }

  return GENERATION_STAGE_META[snapshot.job.currentStage].headlinePool;
}

export function getProgressPercent(snapshot: JobSnapshot): number {
  if (snapshot.result && snapshot.job.status === "completed") {
    return 100;
  }

  const completedCount = snapshot.job.stages.filter((stage) => stage.status === "completed").length;

  if (snapshot.job.status !== "failed" && completedCount === 0 && snapshot.job.currentStage === "Discover") {
    return MIN_DISCOVER_PROGRESS_PERCENT;
  }

  return Math.round((completedCount / JOB_STAGES.length) * 100);
}

export function getCurrentOperation(job: JobRecord): GenerationLogItem {
  const currentStage = job.stages.find((stage) => stage.name === job.currentStage);

  return {
    id: `${job.currentStage}-${currentStage?.startedAt ?? "pending"}-${currentStage?.endedAt ?? "active"}`,
    label: job.currentStage,
    message:
      currentStage?.error ??
      currentStage?.message ??
      job.failureMessage ??
      GENERATION_STAGE_META[job.currentStage].placeholder,
    tone: job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "active"
  };
}

function getSnapshotStageProgress(snapshot: JobSnapshot): number {
  const completedCount = snapshot.job.stages.filter((stage) => stage.status === "completed").length;
  const terminalWeight = snapshot.job.status === "completed" ? 2 : snapshot.job.status === "failed" ? 1 : 0;

  return completedCount * 10 + getStageIndex(snapshot.job.currentStage) * 2 + terminalWeight;
}

export function shouldApplyProgressSnapshot(current: JobSnapshot | null, next: JobSnapshot): boolean {
  if (!current) {
    return true;
  }

  const currentUpdatedAt = Date.parse(current.job.updatedAt);
  const nextUpdatedAt = Date.parse(next.job.updatedAt);

  if (!Number.isNaN(currentUpdatedAt) && !Number.isNaN(nextUpdatedAt) && currentUpdatedAt !== nextUpdatedAt) {
    return nextUpdatedAt > currentUpdatedAt;
  }

  return getSnapshotStageProgress(next) >= getSnapshotStageProgress(current);
}

export function getGenerationLogItems(job: JobRecord, limit = 3): GenerationLogItem[] {
  const entries = job.stages
    .filter((stage) => stage.message || stage.error)
    .map((stage): GenerationLogItem => {
      const isFailedStage = stage.name === job.currentStage && job.status === "failed";
      const isSuccessStage = stage.name === "Validate" && job.status === "completed";
      const isCurrentStage = stage.name === job.currentStage && job.status !== "failed" && job.status !== "completed";

      return {
        id: `${stage.name}-${stage.startedAt ?? "pending"}-${stage.endedAt ?? "active"}`,
        label: stage.name,
        message: stage.error ?? stage.message ?? GENERATION_STAGE_META[stage.name].placeholder,
        tone: isFailedStage ? "danger" : isSuccessStage ? "success" : isCurrentStage ? "active" : "default"
      };
    });

  if (entries.length === 0) {
    return [
      {
        id: `${job.currentStage}-placeholder`,
        label: job.currentStage,
        message: job.failureMessage ?? GENERATION_STAGE_META[job.currentStage].placeholder,
        tone: job.status === "failed" ? "danger" : "active"
      }
    ];
  }

  return entries.slice(-limit);
}

export function restartFailedJobFromDiscover(job: JobRecord, nowIso = new Date().toISOString()): JobRecord {
  if (job.status !== "failed" || !job.failureStage) {
    return job;
  }

  return {
    ...job,
    status: "queued",
    currentStage: "Discover",
    updatedAt: nowIso,
    stages: resetStages(job.stages),
    evidence: undefined,
    extracted: undefined,
    result: undefined,
    failureStage: undefined,
    failureMessage: undefined,
    retryCount: (job.retryCount ?? 0) + 1,
    lastRetriedAt: nowIso
  };
}

export function restartCoverageJobFromDiscover(job: JobRecord, nowIso = new Date().toISOString()): JobRecord {
  if (job.status !== "completed" || !job.evidence || job.evidence.failures.length === 0) {
    return job;
  }

  return {
    ...job,
    status: "queued",
    currentStage: "Discover",
    updatedAt: nowIso,
    stages: resetStages(job.stages),
    extracted: undefined,
    result: undefined,
    failureStage: undefined,
    failureMessage: undefined,
    retryCount: (job.retryCount ?? 0) + 1,
    lastRetriedAt: nowIso
  };
}
