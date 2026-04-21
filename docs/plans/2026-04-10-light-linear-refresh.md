# Light Linear Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tighten the homepage, results page, and shared UI components into a bright Linear-inspired visual system without changing any route or result contracts.

**Architecture:** Refresh the global visual tokens first, then update shared card/button/input patterns, then retune homepage and results-page spacing and controls so the whole app reads as one restrained product surface. Keep all existing data flow and route behavior unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Vitest, React Testing Library, Tailwind CSS

---

### Task 1: Write failing visual-system tests first

**Files:**
- Modify: `test/homepage.test.tsx`
- Modify: `test/workbench.test.tsx`

**Step 1: Write the failing test**

Add expectations that require:
- a tighter homepage form shell and compact CTA styling hook
- tighter workbench tab/control styling hooks

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/workbench.test.tsx`
Expected: FAIL because the current components still use the previous softer visual classes.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the expected hooks.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/workbench.test.tsx`
Expected: still FAIL until Tasks 2-4 land.

### Task 2: Refresh global tokens and shared card surfaces

**Files:**
- Modify: `app/globals.css`
- Modify: `components/shared/section-card.tsx`

**Step 1: Use the failing tests from Task 1**

Keep the new visual tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/workbench.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- cooler white-led global tokens
- tighter card radius and padding
- lighter, more restrained shared card styling

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/workbench.test.tsx`
Expected: still FAIL until page-specific changes land.

### Task 3: Tighten homepage hero controls

**Files:**
- Modify: `components/home/home-shell.tsx`
- Modify: `components/home/url-input-form.tsx`
- Test: `test/homepage.test.tsx`
- Test: `test/url-submit.test.tsx`

**Step 1: Use the failing tests from Task 1**

Keep homepage style expectations red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- tighter hero spacing
- more restrained ambient background
- compact input shell and CTA
- unchanged submission logic

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: PASS

### Task 4: Tighten results workbench controls and density

**Files:**
- Modify: `components/workbench/workbench-shell.tsx`
- Modify: `components/results/results-client.tsx`
- Test: `test/workbench.test.tsx`
- Test: `test/results-client.test.tsx`

**Step 1: Use the failing tests from Task 1**

Keep workbench style expectations red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/workbench.test.tsx test/results-client.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- denser summary card spacing
- tighter badges and export tabs
- smaller-radius control styling for retry/resume actions
- keep the results layout and contracts unchanged

**Step 4: Run test to verify it passes**

Run: `npm test -- test/workbench.test.tsx test/results-client.test.tsx`
Expected: PASS

### Task 5: Full verification and local validation

**Files:**
- Modify only if verification reveals a regression

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

Expected:
- all commands exit successfully

**Step 2: Restart local dev server**

Run: `npm run dev`
Expected: app serves locally for visual validation.
