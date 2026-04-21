# Batch 6 Partial Crawl Resume Design

**Goal:** Add explicit resume behavior for completed jobs with partial crawl coverage, using the existing `?retry=1` route surface and without changing the UI or result contract.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` stable.
- Keep stage names and export tab names unchanged.
- Keep the current workbench/result contract stable.
- Resume only partial crawl coverage first; do not deepen crawl depth yet.

## Current Problem

Batch 5 lets failed jobs retry, but completed jobs with `evidence.failures` remain frozen:

- they carry `Partial crawl coverage` risk
- they cannot revisit failed URLs
- there is no way to improve evidence quality without starting a new job

The smallest next step is to let completed partial-coverage jobs resume discovery for failed URLs only.

## Approach Options

### Option A: Reuse `GET ?retry=1` for completed partial coverage

- If a completed job has `evidence.failures.length > 0`, `retry=1` resets the job into a discovery-resume path.
- Discovery retries only the failed URLs and merges any successes into the existing evidence.
- Downstream stages are reset so partitions/extraction/result rebuild from the updated evidence.

Pros:
- Same route surface as Batch 5.
- Smallest contract-preserving extension.
- Natural continuation of the persisted orchestration seam.

Cons:
- Needs a small amount of discovery-specific state handling.

### Option B: Add a separate resume query or route

- Use a different query flag or route for partial coverage.

Pros:
- More explicit.

Cons:
- Unnecessary route/API expansion.

### Option C: Retry the full root crawl on completed jobs

- Reset to `Discover` and crawl from scratch.

Pros:
- Simple implementation.

Cons:
- Wastes successful evidence already gathered.
- More likely to create drift or duplication.

## Recommendation

Choose Option A.

It keeps retry semantics explicit and reuses the existing route surface while preserving already successful evidence.

## Design

- Extend `prepareJobForRetry()` or add a sibling helper for completed partial-coverage jobs.
- Completed partial resume should:
  - keep `evidence.pages`
  - keep only failed URLs in `evidence.failures`
  - reset `Discover`, `Partition`, `Extract`, `Generate`, and `Validate` to pending
  - clear `extracted` and `result`
  - increment `retryCount` and set `lastRetriedAt`
- Update discovery logic:
  - if `job.evidence.failures` is present on a resumed job, retry only those failed URLs
  - merge successful retries into `evidence.pages`
  - leave only still-failing URLs in `evidence.failures`

## Stage Reset Rules

- For failed-job retry:
  - keep the Batch 5 behavior unchanged
- For completed partial-coverage resume:
  - `status -> queued`
  - `currentStage -> Discover`
  - reset all stages from `Discover` onward to pending
  - preserve `submittedUrl`, presets/categories, and successful evidence pages
  - clear `failureStage`/`failureMessage`

## Testing Strategy

- Unit test for preparing a completed partial-coverage job for resume.
- API test for:
  - completed job with one failed same-origin page
  - `GET ?retry=1` retries only failed URLs
  - resumed discover call merges recovered pages into evidence
  - downstream stages rebuild to a completed result with reduced or cleared crawl failures

## Non-Goals

- No UI retry controls.
- No deeper crawl depth.
- No JS-rendered crawling.
- No new route.
