# Homepage Vercel Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh the homepage into a minimal Vercel-inspired landing page while preserving the current URL submission and results-route behavior.

**Architecture:** Keep the homepage route and form submission logic intact, but replace the current hero-shell-plus-sections layout with a centered hero and three lightweight supporting cards. Remove the stage strip and style gallery from the homepage surface without changing any downstream job or result contracts.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Vitest, React Testing Library

---

### Task 1: Write failing homepage-structure tests first

**Files:**
- Modify: `test/homepage.test.tsx`
- Modify: `test/url-submit.test.tsx`

**Step 1: Write the failing test**

Update the homepage tests so they require:
- the hero headline `Design taste, extracted.`
- the `Extract` CTA
- the three supporting cards
- absence of assertions for the stage strip and style gallery

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: FAIL because the homepage still renders the old hero copy and CTA text.

**Step 3: Write minimal implementation**

Do not change production code yet beyond any tiny scaffolding needed to express the new expectations.

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: still FAIL until Tasks 2 and 3 land.

### Task 2: Replace the homepage hero structure

**Files:**
- Modify: `components/home/home-shell.tsx`

**Step 1: Use the failing tests from Task 1**

Keep the homepage tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- the new minimal hero layout
- lighter product-facing copy
- removal of the homepage stage strip and style gallery
- the three supporting cards below the hero

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: still FAIL until the form text changes land in Task 3.

### Task 3: Restyle the URL form for the new hero

**Files:**
- Modify: `components/home/url-input-form.tsx`
- Test: `test/url-submit.test.tsx`

**Step 1: Use the failing tests from Task 1**

Keep the CTA and hero-form tests red.

**Step 2: Run test to verify it fails**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement:
- `Extract` as the primary CTA label
- lighter placeholder copy
- hidden accessible label support while removing the visible hero label
- a more minimal pill-like form container

**Step 4: Run test to verify it passes**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx`
Expected: PASS

### Task 4: Verify homepage-only regression surface

**Files:**
- Test: `test/homepage.test.tsx`
- Test: `test/url-submit.test.tsx`
- Test: `test/results-page.test.tsx`
- Test: `test/results-client.test.tsx`

**Step 1: Run targeted verification**

Run: `npm test -- test/homepage.test.tsx test/url-submit.test.tsx test/results-page.test.tsx test/results-client.test.tsx`
Expected: PASS

**Step 2: Write minimal implementation**

Fix only homepage-triggered regressions if they appear.

### Task 5: Full verification

**Files:**
- Modify only if verification reveals a homepage regression

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run lint`

Expected:
- all commands exit successfully

**Step 2: Summarize changes**

Document that the homepage now behaves as a minimal product landing page while preserving the existing submit-and-route contract.
