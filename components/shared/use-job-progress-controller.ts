"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { restartFailedJobFromDiscover, shouldApplyProgressSnapshot } from "@/lib/generation-progress";
import { JobSnapshot } from "@/types";

interface UseJobProgressControllerOptions {
  jobId: string | null;
  initialSnapshot: JobSnapshot | null;
}

const POLL_INTERVAL_MS = 1000;

export function useJobProgressController({ jobId, initialSnapshot }: UseJobProgressControllerOptions) {
  const [snapshot, setSnapshot] = useState<JobSnapshot | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const snapshotRef = useRef<JobSnapshot | null>(initialSnapshot);

  useEffect(() => {
    setSnapshot(initialSnapshot);
    snapshotRef.current = initialSnapshot;
    setError(null);
    setIsRetrying(false);
  }, [initialSnapshot, jobId]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const handleRetry = useCallback(async () => {
    if (!jobId) {
      return;
    }

    setIsRetrying(true);
    setError(null);

    setSnapshot((current) => {
      if (!current || current.job.status !== "failed") {
        return current;
      }

      const nextSnapshot = {
        job: restartFailedJobFromDiscover(current.job)
      };

      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    });

    try {
      const response = await fetch(`/api/jobs/${jobId}?retry=1`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Retry failed.");
      }

      const nextSnapshot = (await response.json()) as JobSnapshot;
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
    } catch {
      setError("Retry failed. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !snapshot) {
      return;
    }

    if (snapshot.job.status === "completed" || snapshot.job.status === "failed") {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let inFlight = false;

    const isSettled = (value: JobSnapshot | null) =>
      !value || value.job.status === "completed" || value.job.status === "failed";

    const scheduleNextPoll = () => {
      if (cancelled || isSettled(snapshotRef.current)) {
        return;
      }

      timeoutId = window.setTimeout(runPoll, POLL_INTERVAL_MS);
    };

    const runPoll = async () => {
      if (cancelled || inFlight || isSettled(snapshotRef.current)) {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Polling failed.");
        }

        const nextSnapshot = (await response.json()) as JobSnapshot;

        setSnapshot((current) => {
          if (!shouldApplyProgressSnapshot(current, nextSnapshot)) {
            return current;
          }

          snapshotRef.current = nextSnapshot;
          return nextSnapshot;
        });
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Polling paused briefly. Retrying...");
        }
      } finally {
        inFlight = false;
        scheduleNextPoll();
      }
    };

    scheduleNextPoll();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [jobId, snapshot?.job.status]);

  return {
    snapshot,
    error,
    isRetrying,
    handleRetry,
    setSnapshot
  };
}
