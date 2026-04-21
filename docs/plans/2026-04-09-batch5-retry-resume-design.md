# Batch 5 Retry/Resume Design

**Goal:** Add explicit retry/resume semantics for failed jobs through the existing job route without changing the current UI structure or result contract.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` stable.
- Do not redesign the homepage or workbench.
- Keep stage names, export tab names, and the `ResultRecord` shape unchanged.
- Add an opt-in retry path for failed jobs.

## Current Problem

Batch 3 introduced explicit failed-job states, but there is no recovery path:

- once a job is `failed`, `GET /api/jobs/[jobId]` becomes read-only
- the polling client stops on `failed`
- evidence gathered before a later-stage failure cannot be resumed

The smallest useful next step is backend retry support, even before adding UI controls.

## Approach Options

### Option A: Opt-in retry on existing GET route

- Accept `?retry=1` on `GET /api/jobs/[jobId]`.
- If the job is failed and retryable, clear the failed stage state and re-run that stage.
- Preserve previously completed evidence/extraction state when retrying later stages.

Pros:
- Smallest route-compatible change.
- No UI contract changes.
- Easy to test.

Cons:
- No visible retry button yet.

### Option B: New retry route

- Add `POST /api/jobs/[jobId]/retry`.

Pros:
- Cleaner API shape.

Cons:
- Broader route surface.
- More work for the same backend value.

### Option C: Automatic retry on every failed read

- Failed jobs automatically retry when read again.

Pros:
- No extra client action.

Cons:
- Surprising behavior.
- Makes failed state unstable.

## Recommendation

Choose Option A.

It preserves the current route contract, makes retry explicit, and stays compatible with a future UI button that can call the same endpoint.

## Design

- Extend `JobRecord` with minimal retry metadata:
  - `retryCount`
  - `lastRetriedAt`
- Add a retry helper in the jobs/orchestration seam that:
  - only applies to failed jobs
  - resets the failed stage to `pending`
  - clears `failureStage`, `failureMessage`, and the failed stage error
  - preserves earlier completed stages and prior evidence/extracted state
- Update `GET /api/jobs/[jobId]`:
  - parse `retry=1`
  - if present and the job is failed, prepare it for retry, persist it, then advance it once

## Retry Rules

- `Discover` failure:
  - retry from `Discover`
  - preserve no partial stage error state
- `Partition`, `Extract`, `Generate`, `Validate` failure:
  - retry the failed stage only
  - preserve prior `evidence`, `extracted`, and `result` state as appropriate
- completed jobs:
  - `retry=1` is a no-op
- running/queued jobs:
  - `retry=1` is ignored; normal advancement continues

## Testing Strategy

- Lifecycle/unit tests for resetting failed stage state.
- API tests for:
  - retrying a failed discover job with a later successful fetch
  - retrying a failed later-stage job without losing earlier evidence
  - no-op retry on completed jobs

## Non-Goals

- No retry UI in this batch.
- No deep crawl expansion.
- No JS-rendered crawling.
- No new route.
