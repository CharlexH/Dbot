# Inferred Design System Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add data-driven inferred design-system sections to the results workbench and exports while preserving the current observed content.

**Architecture:** Introduce a shared derived-model helper that converts existing result signals into richer section data. Feed that helper into mocks, orchestration, Gemini generation, export generation, and the workbench sidebar so the UI and artifact outputs remain synchronized.

**Tech Stack:** Next.js 14, React 18, TypeScript, Vitest, Testing Library

---

### Task 1: Add failing tests for inferred sections

**Files:**
- Modify: `/Users/charlex/Documents/Dbot/test/workbench.test.tsx`
- Modify: `/Users/charlex/Documents/Dbot/test/export-generation.test.ts`
- Create: `/Users/charlex/Documents/Dbot/test/design-system-inference.test.ts`

**Steps:**
1. Assert the left sidebar renders the new inferred section headings.
2. Assert export payloads include the derived design-system structure.
3. Assert the derived helper produces conservative inferred summaries from fixture data.

### Task 2: Add derived design-system types and helper

**Files:**
- Modify: `/Users/charlex/Documents/Dbot/types/dbot.ts`
- Create: `/Users/charlex/Documents/Dbot/lib/design-system-inference.ts`

**Steps:**
1. Define the new derived section interfaces.
2. Implement a pure helper that derives `buttons`, `icons`, `spacingSystem`, `material`, `motion`, and `rendering` from `ResultRecord`.
3. Keep the helper deterministic and side-effect free.

### Task 3: Populate derived sections in result builders

**Files:**
- Modify: `/Users/charlex/Documents/Dbot/lib/mocks.ts`
- Modify: `/Users/charlex/Documents/Dbot/lib/orchestration.ts`
- Modify: `/Users/charlex/Documents/Dbot/lib/gemini.ts`

**Steps:**
1. Populate the new derived structure when fixture results are built.
2. Populate it when orchestration builds a live result.
3. Populate it when Gemini builds a live result.

### Task 4: Extend export generation

**Files:**
- Modify: `/Users/charlex/Documents/Dbot/lib/exports.ts`

**Steps:**
1. Add inferred section content to `DESIGN.md`.
2. Include the new structure in `Design JSON`.
3. Include an `inferred` group in `Design Tokens`.

### Task 5: Extend the sidebar UI

**Files:**
- Modify: `/Users/charlex/Documents/Dbot/components/workbench/workbench-shell.tsx`

**Steps:**
1. Preserve the current five cards.
2. Append the new inferred cards in a reference-inspired vertical rhythm.
3. Keep the light-theme sidebar tokens and the no-copy constraint on the left rail.

### Task 6: Verify and review

**Files:**
- Verify only

**Steps:**
1. Run `CI=1 npx vitest run test/design-system-inference.test.ts test/workbench.test.tsx test/export-generation.test.ts test/results-client.test.tsx --reporter=verbose --pool=forks --poolOptions.forks.singleFork`
2. Run `npx tsc --noEmit`
3. Verify `/workbench/mock` in the running dev server.
