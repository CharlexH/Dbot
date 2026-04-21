# Dbot

Turn any website into `DESIGN.md` and design tokens your agent can actually use. ✨

Dbot is a local-first design extraction workbench built for designers, design engineers, and agent builders. Paste a URL, let Dbot run a bounded same-origin crawl, and get an evidence-backed package of brand signals, structured exports, and implementation-ready tokens.

## Why Dbot

Most site-to-design tooling stops at screenshots, vague summaries, or brittle one-off prompts. Dbot is built for a more useful handoff:

- it keeps a visible stage-by-stage pipeline
- it preserves evidence from the pages it crawls
- it exports both narrative output and machine-readable artifacts
- it lets you retry and resume without changing the result contract

## What you get

- `DESIGN.md` for agent-friendly design handoff
- `Design JSON` for structured downstream use
- `Tailwind v4` theme variables
- `CSS Variables` for direct implementation
- `Design Tokens` for system-level reuse

## Product highlights

- 🎯 URL-to-result flow: submit a website on `/`, then follow a persisted job through `/results/[jobId]`.
- 🧠 Evidence-backed extraction: palette, typography, spacing, materials, and previews are derived from crawl evidence instead of pure guesswork.
- 🔎 Inspectable provenance: results are separated into `observed`, `derived`, and `synthesis` layers, so you can see what was found, inferred, or written.
- 🔁 Retry and resume: failed jobs and partial crawl coverage can resume through the existing `retry=1` route surface.
- 🪜 Clear pipeline: the product keeps one stable stage order: `Discover`, `Partition`, `Extract`, `Generate`, `Validate`.
- 📦 Multi-format exports: one main `DESIGN.md`, plus `Design JSON`, `Tailwind v4`, `CSS Variables`, and `Design Tokens`.
- 🧪 Fixture-backed workbench: `/workbench/mock` stays available for stable UI and contract testing.

## How it works

1. Paste a public URL.
2. Dbot creates a persisted local job.
3. The crawler collects shallow, same-origin HTML evidence.
4. The pipeline derives brand signals, partitions, guidance, and exports.
5. The result workbench shows progress first, then hands off a reusable design package.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you want server-side Gemini support, set `DBOT_GEMINI_API_KEY` in `.env.local`.

## Commands

```bash
npm run dev
npm test
npm run lint
npm run build
npm run typecheck
```

Note: run `npm run build` and `npm run typecheck` sequentially. Both write to `.next`.

## Current constraints

- ⚠️ HTML-first today: live jobs use a bounded same-origin HTML crawl.
- ⚠️ No browser rendering yet: JavaScript execution and external stylesheet fetching are intentionally out of scope in the current contract.
- ⚠️ Not absolute ground truth: parts of the output are inferred or synthesized, so Dbot is best used as inspectable design intelligence.
- ⚠️ One main output: Dbot keeps one main `DESIGN.md` plus a partition appendix instead of splitting the result into multiple documents.
- ⚠️ Local persistence: jobs are stored through `DBOT_RUNTIME_FILE` or `data/runtime/jobs.json`.

## Who this is for

- Designers who want a faster starting point before rebuilding a product language
- Design engineers who need tokens and implementation hints, not just moodboards
- Agent builders who want structured outputs instead of raw crawl text
- Product teams exploring how to turn existing web surfaces into reusable system guidance

## Roadmap

The current documented next step is Batch 10: improve visual-hint fidelity by parsing bounded same-origin stylesheet references without changing the route, result, or workbench contracts.

## Built with

Next.js 14, React 18, Tailwind CSS, Vitest, and a local persisted job pipeline.
