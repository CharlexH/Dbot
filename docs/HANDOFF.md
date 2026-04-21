# Dbot Handoff

## Current State
- Project root: `/Users/charlex/Documents/Dbot`
- Stack: Next.js 14 App Router, React 18, Tailwind CSS, Vitest, React Testing Library
- Product scope completed so far:
  - Batch 1: homepage shell, style gallery, stage vocabulary, fixture-backed workbench shell
  - Batch 2: local persisted async job lifecycle, `/api/jobs`, `/api/jobs/[jobId]`, `/results/[jobId]`, client polling until completion
  - Batch 3: persisted crawl/extract orchestration, same-origin evidence-backed result assembly, explicit failed-job states
  - Batch 4: dedicated export generation with richer evidence-backed non-`DESIGN.md` artifacts
  - Batch 5: opt-in retry/resume for failed jobs through the existing job route
  - Batch 6: completed-job partial-crawl resume through the existing retry query
  - Batch 7: bounded multi-hop same-origin evidence expansion
  - Batch 8: downstream retry invalidation for later-stage failures plus results-page retry/resume affordances
  - Batch 9: evidence-backed extraction quality improvements for palette, typography, and component previews

## What Exists
- Homepage:
  - [`app/page.tsx`](/Users/charlex/Documents/Dbot/app/page.tsx)
  - [`components/home/home-shell.tsx`](/Users/charlex/Documents/Dbot/components/home/home-shell.tsx)
  - [`components/home/url-input-form.tsx`](/Users/charlex/Documents/Dbot/components/home/url-input-form.tsx)
  - URL submission now calls `/api/jobs` and routes to `/results/{jobId}`
- Job lifecycle:
  - [`lib/jobs.ts`](/Users/charlex/Documents/Dbot/lib/jobs.ts)
  - File-backed repository via `DBOT_RUNTIME_FILE` or `data/runtime/jobs.json`
  - Job state is persisted directly on the job record
  - `GET /api/jobs/[jobId]` advances one real stage per poll until terminal state
  - Failed jobs can now be retried with `GET /api/jobs/{jobId}?retry=1`
  - Retry metadata is persisted on the job record via `retryCount` and `lastRetriedAt`
  - Retrying a later-stage failure now reopens the minimum downstream stage window needed to rebuild derived state before validation
  - Completed jobs with `evidence.failures` can now resume discovery for failed URLs via the same `retry=1` query
- Orchestration:
  - [`lib/orchestration.ts`](/Users/charlex/Documents/Dbot/lib/orchestration.ts)
  - `Discover` performs a shallow same-origin HTML crawl from the submitted URL
  - Initial discovery now uses a bounded breadth-first same-origin queue instead of only the first tiny direct-link set
  - On resumed completed jobs, `Discover` retries only previously failed same-origin URLs and merges recovered pages into existing evidence
  - Crawled page evidence now carries lightweight visual hints such as `themeColor`, `accentColors`, and `fontFamilies`
  - `Partition`, `Extract`, `Generate`, and `Validate` derive the current `ResultRecord` contract from persisted evidence
  - Discover failures and later stage exceptions now produce explicit failed jobs with stage-level errors
- Export generation:
  - [`lib/exports.ts`](/Users/charlex/Documents/Dbot/lib/exports.ts)
  - `DESIGN.md` remains the main narrative export
  - `Design JSON` is now a faithful machine-readable projection of the result contract plus export metadata
  - `Tailwind v4`, `CSS Variables`, and `Design Tokens` now use semantic token names instead of positional placeholders
- Extraction quality:
  - Palette derivation now prefers evidence-backed colors from theme/meta/style hints before preset fallback
  - Typography derivation now prefers evidence-backed font-family declarations before category fallback
  - Component previews now use page-role cues from URL/title/heading signals instead of generic surface labels where possible
- Results route:
  - [`app/results/[jobId]/page.tsx`](/Users/charlex/Documents/Dbot/app/results/[jobId]/page.tsx)
  - [`components/results/results-client.tsx`](/Users/charlex/Documents/Dbot/components/results/results-client.tsx)
  - Polls `/api/jobs/[jobId]` every 1s until terminal state
  - Swaps to workbench UI once `result` is available
  - Failed jobs now expose a small in-place retry affordance that calls the existing `retry=1` query and resumes polling
  - Completed jobs with partial crawl coverage now expose a small workbench-level resume affordance that calls the same `retry=1` query and re-enters the lifecycle
- Workbench shell:
  - [`components/workbench/workbench-shell.tsx`](/Users/charlex/Documents/Dbot/components/workbench/workbench-shell.tsx)
  - Still renders fixture-backed result content, now fed by live job snapshots when complete
- Contracts and fixtures:
  - [`types/dbot.ts`](/Users/charlex/Documents/Dbot/types/dbot.ts)
  - [`lib/mocks.ts`](/Users/charlex/Documents/Dbot/lib/mocks.ts)
  - Export tabs and stage names are fixed by contract
  - Fixture runs still back `/workbench/mock`, but live job completion no longer uses `fixtureKey`

## Verified Status
- `npm test`: passing
- `npm run lint`: passing
- `npm run build`: passing
- `npm run typecheck`: passing

## Important Constraints
- Do not change the canonical stage order:
  - `Discover`, `Partition`, `Extract`, `Generate`, `Validate`
- Do not change export tab names:
  - `DESIGN.md`, `Design JSON`, `Tailwind v4`, `CSS Variables`, `Design Tokens`
- Keep the same-domain policy:
  - one main `DESIGN.md` result plus a partition appendix
- Keep the low-confidence policy:
  - continue generation and attach risk labels
- Keep live crawling shallow and same-origin:
  - bounded same-origin HTML crawl only
  - no browser rendering or JS execution yet
- Keep the current route and workbench contracts stable:
  - export content can improve, but tab names/order and `ResultRecord` shape should remain stable
- Keep retry explicit:
  - failed jobs should only resume when `retry=1` is requested
  - completed jobs should only resume partial coverage when `retry=1` is requested
- The mock workbench fixtures still exist:
  - `singleExperience`
  - `multiExperience`
  - `lowConfidence`
  - but they are no longer used to complete live jobs

## Known Implementation Notes
- `typecheck` intentionally runs `next build >/dev/null && tsc --noEmit`
  - This is deliberate because `next lint` adds `.next/types/**/*.ts` back into `tsconfig.json`
  - Running raw `tsc --noEmit` without generated Next types is brittle here
  - Do not run `npm run build` and `npm run typecheck` in parallel because both write `.next`
- Compatibility files exist:
  - [`pages/_app.tsx`](/Users/charlex/Documents/Dbot/pages/_app.tsx)
  - [`pages/_document.tsx`](/Users/charlex/Documents/Dbot/pages/_document.tsx)
  - These were added to avoid Next build/runtime issues around missing legacy pages runtime files
- `Dbot` is not initialized as a git repository

## Existing Handoff Artifacts
- [`docs/batch1-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch1-handoff.json)
- [`docs/batch2-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch2-handoff.json)
- [`docs/batch3-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch3-handoff.json)
- [`docs/batch4-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch4-handoff.json)
- [`docs/batch5-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch5-handoff.json)
- [`docs/batch6-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch6-handoff.json)
- [`docs/batch7-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch7-handoff.json)
- [`docs/batch8-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch8-handoff.json)
- [`docs/batch9-handoff.json`](/Users/charlex/Documents/Dbot/docs/batch9-handoff.json)
- [`docs/plans/2026-04-09-batch3-orchestration-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch3-orchestration-design.md)
- [`docs/plans/2026-04-09-batch3-orchestration.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch3-orchestration.md)
- [`docs/plans/2026-04-09-batch4-export-fidelity-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch4-export-fidelity-design.md)
- [`docs/plans/2026-04-09-batch4-export-fidelity.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch4-export-fidelity.md)
- [`docs/plans/2026-04-09-batch5-retry-resume-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch5-retry-resume-design.md)
- [`docs/plans/2026-04-09-batch5-retry-resume.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch5-retry-resume.md)
- [`docs/plans/2026-04-09-batch6-partial-crawl-resume-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch6-partial-crawl-resume-design.md)
- [`docs/plans/2026-04-09-batch6-partial-crawl-resume.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch6-partial-crawl-resume.md)
- [`docs/plans/2026-04-09-batch7-evidence-expansion-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch7-evidence-expansion-design.md)
- [`docs/plans/2026-04-09-batch7-evidence-expansion.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch7-evidence-expansion.md)
- [`docs/plans/2026-04-09-batch9-extraction-quality-design.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch9-extraction-quality-design.md)
- [`docs/plans/2026-04-09-batch9-extraction-quality.md`](/Users/charlex/Documents/Dbot/docs/plans/2026-04-09-batch9-extraction-quality.md)

## Recommended Next Batch
- Batch 10 only:
  - improve visual-hint fidelity by parsing same-origin stylesheet links where practical
  - keep the current route, workbench contract, stage names, and export tab names stable
  - avoid browser rendering and UI redesign while tightening evidence-backed derived content

## Suggested Batch 10 Scope
- Extend visual hint extraction beyond inline HTML into bounded same-origin stylesheet references
- Improve de-duplication and ranking of evidence-backed colors and fonts
- Keep the one-main-`DESIGN.md` plus partition-appendix policy unchanged
- Leave the existing retry/resume UI affordances and route surface intact

## Files Most Likely To Change Next
- [`lib/orchestration.ts`](/Users/charlex/Documents/Dbot/lib/orchestration.ts)
- [`lib/exports.ts`](/Users/charlex/Documents/Dbot/lib/exports.ts)
- [`types/dbot.ts`](/Users/charlex/Documents/Dbot/types/dbot.ts)
- [`test/job-api.test.ts`](/Users/charlex/Documents/Dbot/test/job-api.test.ts)
- [`test/orchestration.test.ts`](/Users/charlex/Documents/Dbot/test/orchestration.test.ts)

## Files That Should Stay Stable If Possible
- [`components/home/home-shell.tsx`](/Users/charlex/Documents/Dbot/components/home/home-shell.tsx)
- export tab names and stage naming in [`types/dbot.ts`](/Users/charlex/Documents/Dbot/types/dbot.ts)
