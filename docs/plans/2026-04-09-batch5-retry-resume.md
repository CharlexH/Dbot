# Batch 5 Retry/Resume Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add explicit retry/resume behavior for failed jobs through the existing job route while preserving the current route/UI/result contracts.

**Architecture:** Failed jobs remain persisted terminal snapshots until a caller explicitly requests retry with `GET /api/jobs/:jobId?retry=1`. The retry path resets only the failed stage state, preserves earlier completed evidence, and then re-enters the existing one-stage-per-read orchestration flow.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library

---

### Task 1: Write failing retry tests first

**Files:**
- Modify: `test/job-api.test.ts`
- Modify: `test/job-lifecycle.test.ts`
- Possibly create: `test/retry.test.ts`

**Step 1: Write the failing test**

Add tests that require:
- failed discover jobs to resume with `?retry=1`
- retry metadata to persist on the job record
- completed jobs to ignore retry requests

**Step 2: Run test to verify it fails**

Run: `npm test -- test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: FAIL because failed jobs are currently terminal and immutable.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: still FAIL until Task 2 lands.

### Task 2: Implement retry preparation and route handling

**Files:**
- Modify: `types/dbot.ts`
- Modify: `lib/jobs.ts`
- Modify: `app/api/jobs/[jobId]/route.ts`
- Possibly modify: `lib/orchestration.ts`

**Step 1: Use the failing tests from Task 1**

Keep the retry tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- retry metadata on `JobRecord`
- failed-stage reset helper
- `retry=1` parsing and retry flow in the existing GET route

**Step 4: Run test to verify it passes**

Run: `npm test -- test/job-api.test.ts test/job-lifecycle.test.ts`
Expected: PASS

### Task 3: Verify contract stability

**Files:**
- Test: `test/orchestration.test.ts`
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`

**Step 1: Run targeted verification**

Run: `npm test -- test/orchestration.test.ts test/results-page.test.tsx test/workbench.test.tsx`
Expected: PASS

**Step 2: Write minimal implementation**

Fix only contract regressions if they appear.

### Task 4: Full verification and handoff update

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `docs/HANDOFF_PROMPT.md`
- Create: `docs/batch5-handoff.json`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Update handoff**

Document the retry seam and next recommended batch.
