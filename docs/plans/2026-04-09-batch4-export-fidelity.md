# Batch 4 Export Fidelity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve non-`DESIGN.md` export fidelity so every export tab is meaningfully derived from the current evidence-backed result state, without changing route or UI contracts.

**Architecture:** Keep orchestration and the `ResultRecord` shape stable. Extract export generation into a dedicated helper that builds all tab contents from the completed result, using semantic token names and explicit metadata. Validation continues to enforce the canonical tab order and appendix policy.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, React Testing Library

---

### Task 1: Write export-fidelity tests first

**Files:**
- Create: `test/export-generation.test.ts`
- Modify: `test/job-api.test.ts`

**Step 1: Write the failing test**

Add tests that require:
- semantic Tailwind variable names instead of positional `--color-1`
- semantic CSS variable names
- structured `Design JSON` metadata
- structured `Design Tokens` metadata including confidence/evidence summary

**Step 2: Run test to verify it fails**

Run: `npm test -- test/export-generation.test.ts test/job-api.test.ts`
Expected: FAIL because the current exports are too thin or use generic naming.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/export-generation.test.ts test/job-api.test.ts`
Expected: still FAIL until Task 2 lands.

### Task 2: Extract export builders and improve export content

**Files:**
- Create: `lib/exports.ts`
- Modify: `lib/orchestration.ts`

**Step 1: Use the failing tests from Task 1**

Keep the new export tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/export-generation.test.ts test/job-api.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- dedicated export helpers
- semantic palette/font variable naming
- richer `Design JSON`
- richer `Design Tokens`
- stable tab order and names

**Step 4: Run test to verify it passes**

Run: `npm test -- test/export-generation.test.ts test/job-api.test.ts`
Expected: PASS

### Task 3: Verify contract stability

**Files:**
- Test: `test/results-page.test.tsx`
- Test: `test/workbench.test.tsx`
- Test: `test/orchestration.test.ts`

**Step 1: Write the failing test**

Only add/adjust tests if needed to catch contract drift.

**Step 2: Run targeted verification**

Run: `npm test -- test/results-page.test.tsx test/workbench.test.tsx test/orchestration.test.ts`
Expected: PASS unless export-builder refactoring drifted the contract.

**Step 3: Write minimal implementation**

Fix only contract regressions if they appear.

**Step 4: Run targeted verification**

Run: `npm test -- test/results-page.test.tsx test/workbench.test.tsx test/orchestration.test.ts`
Expected: PASS

### Task 4: Full verification and handoff update

**Files:**
- Modify: `docs/HANDOFF.md`
- Modify: `docs/HANDOFF_PROMPT.md`
- Create: `docs/batch4-handoff.json`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Write minimal implementation**

Update the handoff to describe the richer export layer and the next batch seam.

**Step 3: Re-run any needed verification**

Run: `npm test`
Expected: PASS
