"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizePublicUrl } from "@/lib/dbot";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from "@/lib/gemini-models";
import { CreateJobResponse } from "@/types";

interface UrlInputFormProps {
  selectedPresetId: string;
  selectedCategory: string;
  onJobCreated?: (payload: CreateJobResponse) => void;
}

interface ModelPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = GEMINI_MODEL_OPTIONS.find((option) => option.id === value) ?? GEMINI_MODEL_OPTIONS[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className="flex h-9 min-w-[190px] items-center justify-between gap-3 rounded-[12px] border border-border bg-panelAlt px-3 text-left transition hover:bg-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-subtle" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="truncate text-base font-medium text-text md:text-sm">{selectedOption.label}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`shrink-0 text-subtle transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-[18px] border border-border bg-panel p-3 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
          <div className="px-1 pb-3">
            <p className="text-base font-semibold text-text md:text-sm">Model</p>
            <p className="mt-1 text-[11px] text-muted">Pick the model for this prompt.</p>
          </div>

          <div id={listboxId} role="listbox" aria-label="Model" className="space-y-2">
            {GEMINI_MODEL_OPTIONS.map((option) => {
              const selected = option.id === value;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-4 py-3 text-left transition ${
                    selected
                      ? "border-borderStrong bg-panelStrong"
                      : "border-border bg-panelAlt hover:bg-panelStrong"
                  }`}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="text-base font-medium text-text md:text-sm">{option.label}</span>
                  {selected ? (
                    <span className="rounded-full border border-borderStrong bg-panel px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      Current
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UrlInputForm({ selectedPresetId, selectedCategory, onJobCreated }: UrlInputFormProps) {
  const hasServerGeminiKey = process.env.NEXT_PUBLIC_DBOT_HAS_SERVER_GEMINI_KEY === "1";
  const [value, setValue] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const urlFieldRef = useRef<HTMLTextAreaElement>(null);
  const validation = useMemo(() => normalizePublicUrl(value), [value]);
  const trimmedApiKey = apiKey.trim();
  const hasManualGeminiKey = trimmedApiKey.length > 0;
  const hasAnyGeminiKey = hasServerGeminiKey || hasManualGeminiKey;

  useEffect(() => {
    const field = urlFieldRef.current;
    if (!field) {
      return;
    }

    field.style.height = "0px";
    field.style.height = `${Math.max(field.scrollHeight, 48)}px`;
  }, [value]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validation.isValid) {
      return;
    }

    const normalized = normalizePublicUrl(value);
    if (!normalized.isValid || !normalized.normalized) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          url: normalized.normalized,
          selectedPresetIds: [selectedPresetId],
          selectedCategoryIds: [selectedCategory],
          ...(hasAnyGeminiKey ? { geminiModel: model } : {}),
          ...(hasManualGeminiKey ? { geminiApiKey: trimmedApiKey } : {})
        })
      });

      if (!response.ok) {
        throw new Error("Unable to create job.");
      }

      const data = (await response.json()) as CreateJobResponse;
      onJobCreated?.(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="w-full rounded-[16px] bg-white"
        style={{
          border: "1px solid rgba(215, 224, 235, 0.8)",
          boxShadow: "0 22px 48px rgba(148, 163, 184, 0.15), 0 6px 18px rgba(15, 23, 42, 0.08)",
        }}
      >
        <form
          data-testid="homepage-form-shell"
          onSubmit={handleSubmit}
          className="rounded-[10px] bg-transparent"
        >
          <div className="px-4 pb-3 pt-3.5 md:pt-3">
            <textarea
              ref={urlFieldRef}
              aria-label="Website URL"
              rows={2}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Paste a URL like linear.app..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full resize-none overflow-hidden border-0 bg-transparent text-[14px] leading-6 text-text outline-none placeholder:text-subtle"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <div className="flex h-9 w-[154px] items-center gap-1.5 rounded-[10px] border border-border bg-panelAlt px-2.5 transition hover:bg-panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={hasAnyGeminiKey ? "text-success" : "text-subtle"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <input
                aria-label="Gemini API key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Gemini API key"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="w-full border-0 bg-transparent text-base text-text outline-none placeholder:text-subtle md:text-sm"
              />
            </div>

            <ModelPicker value={model} onChange={setModel} />

            <div className="flex-1" />

            <button
              type="submit"
              disabled={submitting || !validation.isValid}
              aria-label={submitting ? "Extracting" : "Extract"}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-accent text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.49-8.49l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {!validation.isValid && value.length > 0 ? <p className="text-center text-base text-danger md:text-sm">{validation.reason}</p> : null}
      {submitError ? <p className="text-center text-base text-danger md:text-sm">{submitError}</p> : null}

      {hasManualGeminiKey ? (
        <p className="text-center text-[11px] text-muted">Using the Gemini key you entered above for this run.</p>
      ) : !hasAnyGeminiKey || hasServerGeminiKey ? (
        <p className="text-center text-[11px] text-subtle">
          No Gemini API key yet? Get one from{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 transition hover:opacity-80"
          >
            Google AI Studio
          </a>{" "}
          to enable AI extraction.
        </p>
      ) : null}
    </div>
  );
}
