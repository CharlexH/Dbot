# Batch 7 Evidence Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand discovery to a bounded two-hop same-origin crawl so Dbot can gather richer evidence without changing the current route or result contracts.

**Architecture:** Keep the existing persisted orchestration and retry seams. Only the `Discover` stage becomes broader: it now traverses a small queue of same-origin links up to a strict page cap, while keeping the same evidence shape and failure tracking.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library

---

### Task 1: Write failing discovery-expansion tests first

**Files:**
- Modify: `test/orchestration.test.ts`
- Modify: `test/job-api.test.ts`

**Step 1: Write the failing test**

Add tests that require:
- second-hop same-origin pages to be discovered
- evidence page count to increase beyond the current direct-link-only behavior

**Step 2: Run test to verify it fails**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts`
Expected: FAIL because current discovery only captures the root page plus the first tiny direct-link set.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts`
Expected: still FAIL until Task 2 lands.

### Task 2: Implement bounded two-hop discovery

**Files:**
- Modify: `lib/orchestration.ts`

**Step 1: Use the failing tests from Task 1**

Keep the new discovery tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- breadth-first same-origin queue
- URL deduplication
- strict page cap
- existing failure tracking

**Step 4: Run test to verify it passes**

Run: `npm test -- test/orchestration.test.ts test/job-api.test.ts`
Expected: PASS

### Task 3: Verify contract stability

**Files:**
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`
- Test: `test/job-lifecycle.test.ts`

**Step 1: Run targeted verification**

Run: `npm test -- test/results-page.test.tsx test/workbench.test.tsx test/job-lifecycle.test.ts`
Expected: PASS

### Task 4: Full verification and handoff update

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `docs/HANDOFF_PROMPT.md`
- Create: `docs/batch7-handoff.json`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Update handoff**

Document the widened discovery seam and the next recommended batch.
