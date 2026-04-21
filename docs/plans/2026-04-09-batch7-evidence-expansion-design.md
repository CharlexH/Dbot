# Batch 7 Evidence Expansion Design

**Goal:** Expand same-origin evidence capture beyond the current root-plus-failed-URL seam while preserving the existing route, UI, and result contracts.

## Scope

- Keep `/api/jobs`, `/api/jobs/[jobId]`, and `/results/[jobId]` stable.
- Keep stage names and export tab names unchanged.
- Keep the current `ResultRecord` shape unchanged.
- Expand discovery breadth only within a strict same-origin, HTML-only budget.

## Current Problem

Discovery is still very narrow:

- first run captures only the root page plus a tiny number of directly linked same-origin pages
- resumed completed jobs only revisit failed URLs
- evidence coverage can miss obvious second-hop pages on the same domain

The smallest next step is to widen discovery breadth while keeping the crawler deterministic and bounded.

## Approach Options

### Option A: Two-hop bounded same-origin crawl

- Crawl the root page.
- Crawl same-origin links found on the root page.
- Crawl a small number of same-origin links found on those fetched child pages.
- Keep a strict `MAX_DISCOVER_PAGES` cap.

Pros:
- Smallest meaningful coverage increase.
- Preserves current route and orchestration model.
- Easy to test deterministically.

Cons:
- Slightly more crawl logic.

### Option B: Increase the first-hop page limit only

- Keep one-hop traversal but raise the page cap.

Pros:
- Very small change.

Cons:
- Misses second-hop docs/app structures where many useful pages live.

### Option C: Add JS-rendered/browser crawl

- Introduce browser rendering or dynamic execution.

Pros:
- More realistic coverage.

Cons:
- Out of scope and too large for this batch.

## Recommendation

Choose Option A.

It materially improves evidence capture without changing contracts or introducing browser rendering.

## Design

- Keep discovery same-origin only.
- Add a queue-based crawl over discovered links.
- Seed the queue with root-page links.
- For each fetched child page, collect more same-origin links and enqueue unseen URLs.
- Stop once `MAX_DISCOVER_PAGES` is reached.
- Preserve the existing failure model:
  - failed page fetches remain in `evidence.failures`
  - successful page fetches land in `evidence.pages`

## Crawl Rules

- Still HTML-only, no JS execution.
- Same-origin only.
- Deduplicate URLs before fetching.
- Prefer breadth-first traversal so high-signal top-level pages are discovered first.
- Keep resumed completed-job behavior compatible:
  - failed-URL-only resume still works
  - initial discovery gets wider coverage than before

## Testing Strategy

- Extend orchestration tests to verify second-hop same-origin discovery.
- Extend API tests to verify wider evidence coverage can improve confidence and partitions without changing the route contract.
- Keep UI tests unchanged unless a contract regression appears.

## Non-Goals

- No UI retry affordance in this batch.
- No new route.
- No JS-rendered crawling.
- No extraction redesign.
