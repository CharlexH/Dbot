"use client";

import { useRouter } from "next/navigation";
import { DotGridBg } from "@/components/home/dot-grid-bg";
import { GenerationProgressCard } from "@/components/shared/generation-progress-card";
import { useJobProgressController } from "@/components/shared/use-job-progress-controller";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { JobSnapshot } from "@/types";

interface ResultsClientProps {
  initialSnapshot: JobSnapshot;
  jobId: string;
}

export function ResultsClient({ initialSnapshot, jobId }: ResultsClientProps) {
  const router = useRouter();
  const { snapshot, error, isRetrying, handleRetry } = useJobProgressController({
    jobId,
    initialSnapshot
  });

  if (!snapshot) {
    return null;
  }

  const canRetryFailedJob = snapshot.job.status === "failed";
  const canResumeCoverage =
    snapshot.job.status === "completed" && snapshot.result && (snapshot.job.evidence?.failures.length ?? 0) > 0;

  if (snapshot.result) {
    const notice = canResumeCoverage ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-info bg-infoSoft px-4 py-3 text-base text-info md:text-sm">
        <p>Partial crawl coverage detected. You can retry failed same-origin URLs without changing the result contract.</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="rounded-[8px] bg-accent px-3 py-1.5 text-sm text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRetrying ? "Resuming..." : "Resume coverage"}
        </button>
      </div>
    ) : error ? (
      <div className="rounded-[10px] border border-danger bg-dangerSoft px-4 py-3 text-base text-danger md:text-sm">{error}</div>
    ) : undefined;

    return <WorkbenchShell run={{ job: snapshot.job, result: snapshot.result }} headerNotice={notice} />;
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-8 md:py-8">
      <DotGridBg />

      <div className="mx-auto flex w-full max-w-[680px] flex-1 items-center">
        <GenerationProgressCard
          snapshot={snapshot}
          onBack={canRetryFailedJob ? () => router.push("/") : undefined}
          onRetry={canRetryFailedJob ? handleRetry : undefined}
          isRetrying={isRetrying}
          auxiliaryError={error}
          className="w-full"
        />
      </div>
    </main>
  );
}
