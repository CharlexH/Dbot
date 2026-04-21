# Batch 9 Extraction Quality Design

**Goal:** Improve palette, typography, and component preview derivation from the wider same-origin evidence set without changing the current route, workbench, stage, or export contracts.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` stable.
- Keep `ResultRecord` UI fields stable.
- Keep stage names and export tab names unchanged.
- Improve extraction quality only within the existing persisted orchestration seam.

## Current Problem

The current extraction layer is still mostly fallback-driven:

- `palette` comes primarily from the selected preset
- `typography` comes primarily from the selected category
- `componentPreviews` are generic page heading/snippet projections

Batch 7 widened evidence coverage, but Batch 8 intentionally did not change extraction quality. The next useful step is to let extraction consume simple visual hints from the crawled HTML.

## Approach Options

### Option A: Add lightweight visual hints to crawled evidence

- Extend `CrawledPageEvidence` with optional fields such as:
  - `themeColor`
  - `accentColors`
  - `fontFamilies`
- Parse only lightweight HTML signals:
  - `<meta name="theme-color">`
  - inline/style-block hex colors
  - inline/style-block `font-family`
- Let result assembly prefer evidence-backed values and fall back to presets/categories only when evidence is missing.

Pros:
- Smallest meaningful extraction improvement.
- Preserves route and result contracts.
- Deterministic and easy to unit-test.

Cons:
- Still limited compared with full CSS parsing.

### Option B: Keep evidence shape unchanged and infer from titles/snippets only

- Do not add new evidence fields.
- Improve extraction from headings and copy alone.

Pros:
- Very small change.

Cons:
- Weak for color and typography.
- Leaves palette largely preset-driven.

### Option C: Parse full CSS or render pages in a browser

- Fetch stylesheets, cascade declarations, or use browser rendering.

Pros:
- Higher fidelity.

Cons:
- Too large for this batch.
- Violates the current shallow same-origin extraction posture.

## Recommendation

Choose Option A.

It uses the wider evidence set in a materially better way while staying bounded and deterministic.

## Design

- Extend `CrawledPageEvidence` with lightweight optional visual-hint fields.
- Update `readHtmlPage()` to extract:
  - first theme color from meta tags
  - a small deduplicated list of hex colors from inline style blocks and style attributes
  - a small deduplicated list of font-family names from inline style blocks and style attributes
- Keep these additions internal and optional so the workbench path does not break.
- Update result assembly:
  - `buildPalette()` should prefer evidence-backed colors first, then preset fallback
  - `buildTypography()` should prefer evidence-backed font families first, then category fallback
  - `buildComponentPreviews()` should derive more specific labels/details from page URL/title/heading patterns before falling back to generic snippets

## Extraction Rules

### Palette

- Prefer `themeColor` as the primary accent when present.
- Collect a bounded set of unique hex colors from evidence pages.
- Filter out near-duplicate values and preserve first-seen order.
- Merge with preset fallback only if there are not enough evidence-backed colors to fill the existing four palette tokens.

### Typography

- Prefer the first evidence-backed serif/sans candidates found in `fontFamilies`.
- Map them into the existing `Display` and `Body` tokens.
- Keep token names and usages unchanged.

### Component previews

- Use page URL/title/heading cues to produce more specific labels such as:
  - `Documentation entry`
  - `Workspace shell`
  - `Marketing CTA`
- Use the strongest heading or snippet on that page as the detail.
- Keep the `ComponentPreview` contract unchanged.

## Testing Strategy

- Add orchestration-level tests that prove:
  - theme-color and inline hex colors influence the generated palette
  - evidence font-family signals influence typography
  - component preview labels/details become more specific than the generic `Surface N` fallback
- Add API-level assertions that the completed job still preserves tab names/order and route behavior while returning richer derived fields.

## Non-Goals

- No route changes.
- No UI redesign.
- No JS rendering.
- No external stylesheet fetching.
- No export tab changes.
