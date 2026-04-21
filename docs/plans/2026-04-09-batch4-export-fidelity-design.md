# Batch 4 Export Fidelity Design

**Goal:** Improve non-`DESIGN.md` export fidelity so every export tab is meaningfully derived from the current result state, without changing routes, UI structure, stage names, or export tab names.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` unchanged.
- Keep the current workbench and tab structure unchanged.
- Preserve the existing `ResultRecord` contract.
- Improve the contents of:
  - `Design JSON`
  - `Tailwind v4`
  - `CSS Variables`
  - `Design Tokens`
- Leave crawl depth and retry/resume semantics for later.

## Current Problem

Batch 3 made exports available for all tabs, but the non-`DESIGN.md` tabs are still thin:

- token names are generic
- export payloads do not expose evidence/confidence metadata
- Tailwind/CSS/token outputs are not clearly synchronized with the semantic result fields

The UI can already render these exports, so the next batch should improve content fidelity, not presentation.

## Approach Options

### Option A: Dedicated export builder from `ResultRecord`

- Move export generation into small helpers.
- Derive semantic variable names from palette/typography tokens.
- Include evidence/confidence/partition metadata in `Design JSON` and `Design Tokens`.

Pros:
- Smallest bounded improvement.
- Easy to test in isolation.
- No route/UI changes.

Cons:
- Still limited by current evidence extraction quality.

### Option B: Improve extraction first, keep export builders simple

- Spend Batch 4 on palette/typography/component inference.
- Let existing export generation benefit indirectly.

Pros:
- Better source data.

Cons:
- Broader surface area.
- Higher risk of changing visible workbench content unexpectedly.

### Option C: Export provenance layer only

- Keep current token content mostly intact.
- Add provenance/confidence metadata to all export payloads.

Pros:
- Very safe.

Cons:
- Doesn’t improve actual utility of Tailwind/CSS outputs enough.

## Recommendation

Choose Option A.

It is the smallest change that makes every export tab more useful while preserving the current UI and orchestration model.

## Design

- Add a dedicated export-generation helper under `lib/`.
- Keep `buildResult()` in orchestration responsible for assembling `ResultRecord`, but delegate export content creation to the helper.
- Use semantic, stable names derived from existing result fields:
  - palette token names -> CSS custom property names and Tailwind theme keys
  - typography token names -> font variable names and token entries
- Include contract-relevant metadata in `Design JSON` and `Design Tokens`:
  - `site`
  - `brandSummary`
  - `partitions`
  - `riskLabels`
  - export metadata
  - evidence summary and confidence where available

## Export Rules

### `DESIGN.md`

- Keep current behavior.
- Minor consistency cleanup only if needed.

### `Design JSON`

- Should be a structured artifact, not just a partial dump.
- Include:
  - `site`
  - `brandSummary`
  - `palette`
  - `typography`
  - `componentPreviews`
  - `guidelines`
  - `partitions`
  - `riskLabels`
  - `includesPartitionAppendix`
  - a small `meta` block with confidence/evidence counts

### `Tailwind v4`

- Generate semantic `@theme` variables from palette and typography tokens.
- Include font variables and color variables with stable names.
- Avoid placeholder numbering like `--color-1`.

### `CSS Variables`

- Mirror the semantic naming used in Tailwind.
- Include a small, readable `:root` export.

### `Design Tokens`

- Emit structured JSON tokens with nested groups:
  - `color`
  - `typography`
  - `meta`
- Preserve confidence/risk metadata.

## Testing Strategy

- Add isolated export-generation tests for semantic naming and metadata content.
- Add API-level assertions that completed jobs return richer export content while preserving tab order and names.
- Keep existing UI tests unchanged unless a contract regression appears.

## Non-Goals

- No crawl-depth increase.
- No JS-rendered crawling.
- No new routes.
- No UI redesign.
- No retry/resume flow in this batch.
