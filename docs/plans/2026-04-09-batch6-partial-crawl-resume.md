# Batch 6 Partial Crawl Resume Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow completed jobs with partial crawl coverage to resume discovery for failed URLs through the existing `GET /api/jobs/:jobId?retry=1` route, then rebuild downstream derived state from the improved evidence.

**Architecture:** Reuse the explicit retry surface from Batch 5. Failed jobs keep their existing retry path. Completed jobs with `evidence.failures` can now be reset into a discovery-resume state that retries only failed URLs, merges recovered evidence, and reruns Partition through Validate using the same persisted orchestration model.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library

---

### Task 1: Write failing partial-resume tests first

**Files:**
- Modify: `test/job-lifecycle.test.ts`
- Modify: `test/job-api.test.ts`

**Step 1: Write the failing test**

Add tests that require:
- completed partial-coverage jobs to be reset for resume
- `GET ?retry=1` on a completed partial-coverage job to retry only failed URLs and continue the lifecycle

**Step 2: Run test to verify it fails**

Run: `npm test -- test/job-lifecycle.test.ts test/job-api.test.ts`
Expected: FAIL because completed jobs currently ignore `retry=1`.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/job-lifecycle.test.ts test/job-api.test.ts`
Expected: still FAIL until Task 2 lands.

### Task 2: Implement completed partial-crawl resume

**Files:**
- Modify: `types/dbot.ts` only if strictly needed
- Modify: `lib/jobs.ts`
- Modify: `lib/orchestration.ts`
- Modify: `app/api/jobs/[jobId]/route.ts`

**Step 1: Use the failing tests from Task 1**

Keep the new resume tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/job-lifecycle.test.ts test/job-api.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- completed partial-coverage reset helper
- failed-URL-only discovery retry
- downstream stage reset after resumed discover

**Step 4: Run test to verify it passes**

Run: `npm test -- test/job-lifecycle.test.ts test/job-api.test.ts`
Expected: PASS

### Task 3: Verify contract stability

**Files:**
- Test: `test/orchestration.test.ts`
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`

**Step 1: Run targeted verification**

Run: `npm test -- test/orchestration.test.ts test/results-page.test.tsx test/workbench.test.tsx`
Expected: PASS

### Task 4: Full verification and handoff update

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `docs/HANDOFF_PROMPT.md`
- Create: `docs/batch6-handoff.json`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Update handoff**

Document the completed partial-resume seam and the next recommended batch.
