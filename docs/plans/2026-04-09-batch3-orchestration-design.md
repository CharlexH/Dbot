# Batch 3 Orchestration Design

**Goal:** Replace fixture-derived job completion with a real same-origin crawl and extraction pipeline while preserving the existing `JobSnapshot` route contract and current UI structure.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` stable.
- Keep the existing workbench/result shape stable so the current UI keeps rendering.
- Preserve canonical stages and export tab names.
- Preserve the one-main-`DESIGN.md` plus partition appendix policy.
- Add explicit failed-job states for crawl/extract/generate failures.

## Approach

### Option A: GET-driven persisted orchestration

- Persist job stage state, evidence, and generated result directly in the job record.
- Let `GET /api/jobs/[jobId]` advance one real stage per poll.
- Use a shallow same-origin crawler that fetches the submitted URL, extracts same-origin links, and fetches a small number of additional pages.

Pros:
- No background worker assumptions.
- Works with the existing polling client.
- Easy to test deterministically.

Cons:
- Progress depends on polling.

### Option B: Fire-and-forget background runner

- Start the whole pipeline in `POST /api/jobs`.
- Polling only reads persisted state.

Pros:
- More realistic async model.

Cons:
- Fragile in local/serverless execution.
- Harder to make deterministic in tests without extra coordination.

### Option C: Keep time-derived stages, swap only the final result source

- Preserve the existing timer-based lifecycle.
- Generate the result from crawled evidence only at completion time.

Pros:
- Smallest change.

Cons:
- Still fake stage progression.
- No explicit stage-level failures.
- Leaves Batch 2’s core limitation in place.

## Recommendation

Choose Option A.

It is the smallest approach that makes the lifecycle real, keeps the existing client polling contract, and remains robust without adding a worker system.

## Architecture

- `lib/jobs.ts`
  - Stop deriving stage progression from elapsed time.
  - Persist real job state, optional crawl evidence, optional analysis, optional result, and optional failure metadata.
  - Keep snapshot assembly separate from orchestration.
- `lib/orchestration.ts`
  - Advance a job by exactly one stage.
  - Discover: shallow same-origin crawl.
  - Partition: group evidence into a main experience plus appendix partitions.
  - Extract: derive brand signals and confidence/risk hints from evidence.
  - Generate: assemble a `ResultRecord`.
  - Validate: enforce export tabs, appendix policy, and final low-confidence labeling.
- `app/api/jobs/[jobId]/route.ts`
  - Load the job.
  - If it is non-terminal, advance one stage and persist.
  - Return the current snapshot.
- `app/api/jobs/route.ts`
  - Create a queued job and return the initial snapshot.
- `app/results/[jobId]/page.tsx`
  - Keep direct-load behavior unchanged: load the current snapshot and render the client.

## Data Contracts

Add the smallest internal types needed for Batch 3:

- `CrawledPageEvidence`
- `CrawlEvidence`
- `ExtractedBrandSignals`
- optional `result` on `JobRecord`
- optional `failureMessage` / `failureStage` on `JobRecord`

These are internal extensions. The existing `JobSnapshot` and `ResultRecord` contract stays stable for the UI.

## Crawl Rules

- Fetch the submitted URL first.
- Parse same-origin links from anchor tags.
- Ignore external origins.
- Fetch only a small fixed number of same-origin pages.
- Best-effort HTML extraction only; no browser rendering or JS execution.

## Result Assembly Rules

- Use crawled page titles, headings, and text snippets to derive:
  - site title
  - narrative
  - tags
  - partitions
  - confidence/risk labels
- Keep export tab names exact.
- Keep a single top-level `DESIGN.md`.
- Put same-origin divergence into the partition appendix.
- Continue generation even with thin evidence; attach low-confidence risk labels instead of aborting.

## Failure Rules

- If root crawl fails, fail the job in `Discover`.
- If later extraction/generation throws, fail the current stage with an explicit error.
- Failed jobs return `result: undefined` and preserve stage error metadata for the loading UI.

## Testing Strategy

- Unit-test crawl parsing and stage advancement with mocked `fetch`.
- Update lifecycle/API tests to verify:
  - queued job creation still returns `/results/{jobId}`
  - repeated GETs advance real stages
  - completed result uses crawled evidence instead of fixtures
  - crawl failures return failed jobs with stage errors
- Keep current UI tests stable unless the contract actually changes.

## Handoff Note

If a later batch needs deeper crawling, JS rendering, or richer token extraction, it should build on the persisted evidence/orchestration seam added here instead of changing the route or workbench contracts.
