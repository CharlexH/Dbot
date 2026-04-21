# Batch 3 Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fixture-backed completion with persisted same-origin crawl and extraction while preserving the existing results route and workbench contract.

**Architecture:** Jobs remain the single source of truth. `POST /api/jobs` creates a queued job, `GET /api/jobs/[jobId]` advances one real stage at a time, and snapshots read from persisted state instead of elapsed-time fixture derivation. Result assembly stays contract-compatible so the existing UI keeps rendering unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library, shallow HTML fetch/extraction via server `fetch`

---

### Task 1: Document the internal Batch 3 state contract

**Files:**
- Modify: `types/dbot.ts`
- Test: `test/job-lifecycle.test.ts`

**Step 1: Write the failing test**

Add a lifecycle test that expects new jobs to start queued with no persisted result and no fixture-derived completion metadata.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/job-lifecycle.test.ts`
Expected: FAIL because the job model still depends on `fixtureKey` and elapsed-time derivation.

**Step 3: Write minimal implementation**

Add the smallest optional evidence/result/failure fields needed on `JobRecord` and keep `JobSnapshot` stable.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/job-lifecycle.test.ts`
Expected: PASS

### Task 2: Add failing orchestration and API tests

**Files:**
- Modify: `test/job-lifecycle.test.ts`
- Modify: `test/job-api.test.ts`
- Create: `test/orchestration.test.ts`

**Step 1: Write the failing test**

Add tests that:
- verify repeated job reads advance real stages in order
- verify a completed result uses crawled titles/headings instead of fixture titles
- verify a crawl failure produces a failed job with stage error metadata

**Step 2: Run test to verify it fails**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: FAIL because the current implementation is still fixture/timer-based.

**Step 3: Write minimal implementation**

Do not change production code yet beyond the minimum test scaffolding needed to express the expected behavior.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: still FAIL until Task 3 implementation lands

### Task 3: Implement crawl and stage advancement

**Files:**
- Modify: `lib/jobs.ts`
- Create: `lib/orchestration.ts`
- Possibly create: `lib/crawl.ts`
- Modify: `app/api/jobs/[jobId]/route.ts`

**Step 1: Write the failing test**

Use the tests from Task 2 as the red state.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- persisted snapshot assembly in `lib/jobs.ts`
- one-stage-per-read advancement
- shallow same-origin crawl
- explicit failed-job handling

**Step 4: Run test to verify it passes**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: PASS

### Task 4: Assemble evidence-backed results without breaking the UI

**Files:**
- Modify: `lib/orchestration.ts`
- Modify: `lib/mocks.ts` only if shared helpers are needed
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`

**Step 1: Write the failing test**

Add/adjust tests to confirm the workbench still renders the canonical export tabs and can load an in-progress job without contract drift.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/results-page.test.tsx test/workbench.test.tsx`
Expected: FAIL only if the orchestration changes break the current UI contract.

**Step 3: Write minimal implementation**

Keep `ResultRecord` compatible and preserve tab/stage naming exactly.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/results-page.test.tsx test/workbench.test.tsx`
Expected: PASS

### Task 5: Verify the full batch and prepare handoff

**Files:**
- Modify: `docs/HANDOFF.md`
- Create: `docs/batch3-handoff.json`

**Step 1: Write the failing test**

Not applicable. This is verification and handoff.

**Step 2: Run verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 3: Write minimal implementation**

Document the completed Batch 3 state and the next recommended seam for a later batch.

**Step 4: Run verification to confirm docs reflect final behavior**

Run: `npm test`
Expected: PASS
