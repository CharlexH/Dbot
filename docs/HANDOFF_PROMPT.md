You are taking over the `Dbot` project at `/Users/charlex/Documents/Dbot`.

Read these first:
1. `/Users/charlex/Documents/Dbot/docs/HANDOFF.md`
2. `/Users/charlex/Documents/Dbot/docs/batch1-handoff.json`
3. `/Users/charlex/Documents/Dbot/docs/batch2-handoff.json`
4. `/Users/charlex/Documents/Dbot/docs/batch3-handoff.json`
5. `/Users/charlex/Documents/Dbot/docs/batch4-handoff.json`
6. `/Users/charlex/Documents/Dbot/docs/batch5-handoff.json`
7. `/Users/charlex/Documents/Dbot/docs/batch6-handoff.json`
8. `/Users/charlex/Documents/Dbot/docs/batch7-handoff.json`
9. `/Users/charlex/Documents/Dbot/docs/batch8-handoff.json`

Current state:
- Batch 1, Batch 2, Batch 3, Batch 4, Batch 5, Batch 6, Batch 7, Batch 8, and Batch 9 are complete.
- Homepage creates local jobs through `/api/jobs`.
- Results are loaded from `/results/[jobId]`.
- The client polls `/api/jobs/[jobId]` until completion.
- Live jobs now advance one real stage per poll and assemble results from shallow same-origin crawl evidence.
- Export content is now generated through a dedicated export layer with richer non-`DESIGN.md` artifacts.
- Failed jobs can now be retried through `GET /api/jobs/[jobId]?retry=1`.
- Completed jobs with partial crawl coverage can now resume failed-url discovery through the same retry query.
- Later-stage retries now reopen the minimum downstream derived stages needed to rebuild state before validation.
- The results UI now exposes small retry/resume affordances over the existing `retry=1` query surface.
- Initial discovery now captures a bounded second hop of same-origin pages.
- Extraction now uses lightweight evidence-backed visual hints for palette, typography, and component preview derivation.
- `/workbench/mock` still uses fixture scenarios for the mock route only.

Your task:
- Continue with Batch 10 only.
- Do not redesign the UI.
- Do not rename stages or export tabs.
- Do not break the one-main-`DESIGN.md` plus partition-appendix policy.
- Build on the existing persisted orchestration seam instead of replacing the route contract.

Rules:
- Work test-first.
- Keep changes scoped to the next batch.
- Preserve the existing job/result route contract unless a change is strictly necessary.
- If you must add new types, do it in a way that does not break the current workbench rendering path.

Expected first actions:
1. Inspect `lib/orchestration.ts`, `lib/exports.ts`, `types/dbot.ts`, and `docs/batch9-handoff.json`.
2. Decide the smallest Batch 10 extension that improves visual-hint fidelity without changing the UI/result contract.
3. Keep any new evidence fields optional so the current workbench rendering path stays stable.
4. Write failing tests for the next lifecycle/orchestration behavior before changing production code.
5. Verify with:
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `npm run typecheck`

Known project quirks:
- `npm run typecheck` intentionally runs `next build >/dev/null && tsc --noEmit`.
- `npm run build` and `npm run typecheck` should be run sequentially, not in parallel, because both write `.next`.
- `pages/_app.tsx` and `pages/_document.tsx` exist only as compatibility shims for build stability.
- The folder is not a git repository yet.
