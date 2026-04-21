"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotGridBg } from "@/components/home/dot-grid-bg";
import { GenerationProgressCard } from "@/components/shared/generation-progress-card";
import { useJobProgressController } from "@/components/shared/use-job-progress-controller";
import { UrlInputForm } from "@/components/home/url-input-form";
import { HOME_PROGRESS_STORAGE_KEY } from "@/lib/generation-progress";
import { stylePresets } from "@/lib/mocks";
import { CreateJobResponse, JobSnapshot } from "@/types";

const HERO_EXIT_DURATION_MS = 280;
const SUCCESS_HOLD_DURATION_MS = 1000;

type HomeFlowState = "idle" | "exitingHero" | "processing" | "failed" | "successHold";

interface StoredHomeProgress {
  jobId: string;
  resultRoute: string;
}

interface ActiveHomeRun {
  jobId: string;
  route: string;
  snapshot: JobSnapshot;
}

function readStoredProgress(): StoredHomeProgress | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(HOME_PROGRESS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredHomeProgress;

    if (!parsed.jobId || !parsed.resultRoute) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredProgress(value: StoredHomeProgress) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(HOME_PROGRESS_STORAGE_KEY, JSON.stringify(value));
}

function clearStoredProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(HOME_PROGRESS_STORAGE_KEY);
}

export function HomeShell() {
  const router = useRouter();
  const selectedPresetId = stylePresets[1].id;
  const selectedCategory = "All";
  const [flowState, setFlowState] = useState<HomeFlowState>("idle");
  const [activeRun, setActiveRun] = useState<ActiveHomeRun | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const { snapshot, error, isRetrying, handleRetry } = useJobProgressController({
    jobId: activeRun?.jobId ?? null,
    initialSnapshot: activeRun?.snapshot ?? null
  });

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const storedProgress = readStoredProgress();

    if (!storedProgress) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/jobs/${storedProgress.jobId}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to recover stored job.");
        }

        const recoveredSnapshot = (await response.json()) as JobSnapshot;

        if (cancelled) {
          return;
        }

        if (recoveredSnapshot.result && recoveredSnapshot.job.status === "completed") {
          clearStoredProgress();
          startTransition(() => {
            router.push(storedProgress.resultRoute);
          });
          return;
        }

        setActiveRun({
          jobId: storedProgress.jobId,
          route: storedProgress.resultRoute,
          snapshot: recoveredSnapshot
        });
        setFlowState(recoveredSnapshot.job.status === "failed" ? "failed" : "processing");
      } catch {
        if (!cancelled) {
          clearStoredProgress();
          setActiveRun(null);
          setFlowState("idle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!activeRun || !snapshot) {
      return;
    }

    if (snapshot.result && snapshot.job.status === "completed") {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }

      setFlowState("successHold");
      successTimerRef.current = window.setTimeout(() => {
        clearStoredProgress();
        setActiveRun(null);
        setFlowState("idle");
        startTransition(() => {
          router.push(activeRun.route);
        });
      }, SUCCESS_HOLD_DURATION_MS);
      return;
    }

    if (snapshot.job.status === "failed") {
      setFlowState("failed");
      writeStoredProgress({ jobId: activeRun.jobId, resultRoute: activeRun.route });
      return;
    }

    if (flowState !== "exitingHero") {
      setFlowState("processing");
    }

    writeStoredProgress({ jobId: activeRun.jobId, resultRoute: activeRun.route });
  }, [activeRun, flowState, router, snapshot]);

  function handleJobCreated(payload: CreateJobResponse) {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }

    setActiveRun({
      jobId: payload.jobId,
      route: payload.route,
      snapshot: payload.snapshot
    });
    setFlowState("exitingHero");

    exitTimerRef.current = window.setTimeout(() => {
      setFlowState("processing");
    }, HERO_EXIT_DURATION_MS);
  }

  function handleBackFromFailure() {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }

    clearStoredProgress();
    setActiveRun(null);
    setFlowState("idle");
  }

  const heroState = flowState === "idle" ? "visible" : flowState === "exitingHero" ? "exiting" : "hidden";
  const progressSnapshot = activeRun && snapshot ? snapshot : null;
  const progressState = "visible";

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-8 md:py-8">
      <DotGridBg />

      <div data-testid="homepage-content-shell" className="mx-auto flex w-full max-w-[680px] flex-1 flex-col">
        <div className="relative flex flex-1 items-center justify-center">
          <section
            data-testid="homepage-hero-shell"
            data-state={heroState}
            className="homepage-hero-shell flex w-full flex-1 flex-col items-center justify-center pb-8 pt-6 text-center md:pb-12 md:pt-12"
          >
            <span className="reveal reveal-delay-2 rounded-[8px] border border-border bg-panel px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Beta</span>
            <h1 className="reveal reveal-delay-3 mt-5 max-w-3xl text-[2rem] font-semibold tracking-[-0.05em] text-text md:text-[2.5rem] md:leading-[1.02]">
              Turn any website into DESIGN.md
            </h1>
            <p className="reveal reveal-delay-4 mt-4 max-w-2xl text-base leading-6 text-muted md:text-sm md:leading-5">
              Paste a URL. Get a design system your agent can use.
            </p>
            <div className="reveal reveal-delay-5 mt-8 w-full">
              <UrlInputForm
                selectedPresetId={selectedPresetId}
                selectedCategory={selectedCategory}
                onJobCreated={handleJobCreated}
              />
            </div>
            <a
              href="https://charlex.me"
              target="_blank"
              rel="noopener noreferrer"
              className="reveal reveal-delay-5 mt-4 text-[11px] uppercase tracking-[0.08em] text-subtle transition hover:text-muted"
            >
              © charlex.me
            </a>
          </section>

          {progressSnapshot ? (
            <div
              data-testid="homepage-progress-shell"
              data-state={progressState}
              className="homepage-progress-shell absolute inset-x-0"
            >
              <GenerationProgressCard
                snapshot={progressSnapshot}
                onBack={progressSnapshot.job.status === "failed" ? handleBackFromFailure : undefined}
                onRetry={progressSnapshot.job.status === "failed" ? handleRetry : undefined}
                isRetrying={isRetrying}
                auxiliaryError={error}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
