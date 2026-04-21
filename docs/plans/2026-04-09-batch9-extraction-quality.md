# Batch 9 Extraction Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve palette, typography, and component preview extraction from same-origin evidence while preserving the current route, result, and workbench contracts.

**Architecture:** Extend the existing crawl evidence with optional lightweight visual hints, then update result assembly to prefer evidence-backed colors, fonts, and page-role cues before falling back to presets/categories. Keep the UI-facing result contract stable and verify behavior through orchestration and API tests.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library

---

### Task 1: Write failing extraction-quality tests first

**Files:**
- Modify: `test/orchestration.test.ts`
- Modify: `test/job-api.test.ts`

**Step 1: Write the failing test**

Add tests that require:
- `<meta name="theme-color">` and inline hex colors to influence the generated palette
- evidence-backed `font-family` values to influence typography
- page-role-aware component preview labels/details instead of only generic `Surface N`

**Step 2: Run test to verify it fails**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: FAIL because extraction is still mostly preset/category driven.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: still FAIL until Task 2 lands.

### Task 2: Extend crawled evidence with lightweight visual hints

**Files:**
- Modify: `types/dbot.ts`
- Modify: `lib/orchestration.ts`

**Step 1: Use the failing tests from Task 1**

Keep the new extraction tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- optional `themeColor`, `accentColors`, and `fontFamilies` on `CrawledPageEvidence`
- bounded extraction of those fields from fetched HTML
- no UI contract changes

**Step 4: Run test to verify it passes**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: still FAIL until Task 3 lands.

### Task 3: Rebuild derived palette, typography, and component previews from evidence

**Files:**
- Modify: `lib/orchestration.ts`
- Test: `test/orchestration.test.ts`
- Test: `test/job-api.test.ts`

**Step 1: Use the failing tests from Task 1**

Keep the extraction tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- evidence-first palette assembly with preset fallback
- evidence-first typography assembly with category fallback
- page-role-aware component preview labels/details

**Step 4: Run test to verify it passes**

Run: `npm test -- --run test/orchestration.test.ts test/job-api.test.ts`
Expected: PASS

### Task 4: Verify contract stability

**Files:**
- Test: `test/results-client.test.tsx`
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`
- Test: `test/export-generation.test.ts`

**Step 1: Run targeted verification**

Run: `npm test -- --run test/results-client.test.tsx test/results-page.test.tsx test/workbench.test.tsx test/export-generation.test.ts`
Expected: PASS

**Step 2: Write minimal implementation**

Fix only contract regressions if they appear.

### Task 5: Full verification and handoff update

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `docs/HANDOFF_PROMPT.md`
- Create: `docs/batch9-handoff.json`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Update handoff**

Document the evidence-backed extraction seam and the next recommended batch.
