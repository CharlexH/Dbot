"use client";

import { useEffect, useState } from "react";
import {
  getAttemptStartedAt,
  getCurrentOperation,
  getHeadlinePool,
  getProgressPercent,
  getStageSubtitle
} from "@/lib/generation-progress";
import { JobSnapshot } from "@/types";

interface GenerationProgressCardProps {
  snapshot: JobSnapshot;
  onBack?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
  auxiliaryError?: string | null;
  className?: string;
}

function formatElapsed(iso: string, nowMs: number): string {
  const startedAtMs = Number.isNaN(Date.parse(iso)) ? nowMs : Date.parse(iso);
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getOperationToneClasses(tone: "default" | "active" | "danger" | "success"): string {
  switch (tone) {
    case "danger":
      return "text-danger";
    case "success":
      return "text-success";
    default:
      return "text-textSoft";
  }
}

function getOperationLabelClasses(tone: "default" | "active" | "danger" | "success"): string {
  switch (tone) {
    case "danger":
    case "success":
      return "font-semibold";
    default:
      return "font-semibold text-text";
  }
}

export function GenerationProgressCard({
  snapshot,
  onBack,
  onRetry,
  isRetrying = false,
  auxiliaryError,
  className = ""
}: GenerationProgressCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const headlinePool = getHeadlinePool(snapshot);
  const progressPercent = getProgressPercent(snapshot);
  const operation = getCurrentOperation(snapshot.job);
  const subtitle = getStageSubtitle(snapshot.job.currentStage);
  const isFailed = snapshot.job.status === "failed";
  const isSuccess = snapshot.job.status === "completed" && Boolean(snapshot.result);
  const showFailureActions = isFailed && (Boolean(onBack) || Boolean(onRetry));

  useEffect(() => {
    setNowMs(Date.now());

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setHeadlineIndex(0);

    if (headlinePool.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeadlineIndex((current) => (current + 1) % headlinePool.length);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [headlinePool]);

  return (
    <section
      data-testid="generation-progress-card"
      className={`generation-progress-card rounded-[20px] border border-border bg-panel p-5 shadow-panel md:p-6 ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[1.55rem] font-semibold tracking-[-0.05em] text-text md:text-[1.8rem]">
            {headlinePool[headlineIndex] ?? headlinePool[0]}
          </h2>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tracking-[-0.04em] text-text">
            {formatElapsed(getAttemptStartedAt(snapshot.job), nowMs)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-panelAlt">
          <div
            className={`generation-progress-fill relative h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isFailed ? "bg-danger" : isSuccess ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {progressPercent > 0 ? <span className="generation-progress-sheen" aria-hidden="true" /> : null}
          </div>
        </div>
      </div>

      <div className={showFailureActions ? "mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start" : "mt-6"}>
        <div>
          <p
            data-testid="generation-current-operation"
            className={`mt-1 text-sm leading-6 ${getOperationToneClasses(operation.tone)}`}
          >
            <span className={getOperationLabelClasses(operation.tone)}>{operation.label}</span>
            <span className="text-current/70"> · </span>
            <span>{operation.message}</span>
          </p>
          {auxiliaryError ? <p className="mt-3 text-sm text-danger">{auxiliaryError}</p> : null}
        </div>

        {showFailureActions ? (
          <div
            data-testid="generation-progress-actions"
            className="flex min-h-[72px] items-end justify-start md:min-w-[104px] md:justify-end"
          >
            <div className="flex flex-wrap items-center gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-[10px] border border-border bg-panel px-4 py-2 text-sm font-medium text-text transition hover:bg-panelAlt"
                >
                  返回
                </button>
              ) : null}
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="rounded-[10px] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRetrying ? "重试中..." : "重试"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
