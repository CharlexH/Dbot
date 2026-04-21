# AGENTS.md

## Repo Snapshot
- Stack: Next.js 14 App Router, React 18, Tailwind CSS, Vitest, React Testing Library
- Main routes: `/`, `/results/[jobId]`, `/workbench/mock`, `/api/jobs`, `/api/jobs/[jobId]`
- Job data persists through `DBOT_RUNTIME_FILE` or `data/runtime/jobs.json`

## Commands
- `npm run dev` - start the local Next.js app
- `npm test` - run the Vitest suite
- `npm run lint` - run Next.js lint
- `npm run build` - run the production build
- `npm run typecheck` - run `next build >/dev/null && tsc --noEmit`

## Verified Workflow Notes
- Run `npm run build` and `npm run typecheck` sequentially, not in parallel, because both write `.next`.
- Prefer `npm` commands here; `package-lock.json` is present and the repo scripts are defined in `package.json`.
- Preserve the current stage order: `Discover`, `Partition`, `Extract`, `Generate`, `Validate`.
- Preserve the export tab names: `DESIGN.md`, `Design JSON`, `Tailwind v4`, `CSS Variables`, `Design Tokens`.
- Keep the one-main-`DESIGN.md` plus partition-appendix policy unchanged.
- Keep crawling shallow and same-origin. Current evidence capture is HTML-first; Batch 9 explicitly excluded browser rendering and external stylesheet fetching.
- Failed jobs and partial-coverage resume both use the existing `GET /api/jobs/[jobId]?retry=1` surface.
- `/workbench/mock` is fixture-backed only; live jobs should continue through the persisted job flow.

## Current Batch Context
- Latest completed handoff in-repo is Batch 9: lightweight visual hints in crawled pages, evidence-backed palette/typography derivation, and page-role-based component preview labels.
- The documented next step is Batch 10: improve visual-hint fidelity by parsing bounded same-origin stylesheet references without changing the route, result, or workbench contracts.

## Constraints
- `pages/_app.tsx` and `pages/_document.tsx` are compatibility shims for build stability.
- The repo is currently not initialized as a git repository.
