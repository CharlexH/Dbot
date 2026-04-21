# Homepage Vercel Refresh Design

**Goal:** Refresh the homepage into a Vercel-inspired minimal landing page that keeps the existing URL-to-job flow intact while removing the stage strip and style gallery from the public-facing layout.

## Scope

- Keep the `/api/jobs` submission contract unchanged.
- Keep the existing homepage route and URL submission behavior unchanged.
- Redesign only the homepage presentation.
- Remove the homepage `Async generation stages` and `Style gallery` sections.
- Replace the current right-rail handoff card with three lighter supporting cards below the hero.

## Current Problem

The homepage is still optimized around the original batch-framing work:

- hero copy is engineering-oriented and references `Batch 1`
- the stage strip and style gallery compete with the primary action
- the current right-side handoff model card makes the landing page feel heavier and more internal-facing than product-facing

The next useful improvement is to make the homepage feel like a polished product entry point while keeping the proven submit-and-route behavior intact.

## Approach Options

### Option A: Keep the current card-shell layout and lightly simplify it

- Retain the large bordered hero shell.
- Shorten the copy and remove the lower sections.
- Keep the overall composition close to the current version.

Pros:
- Lowest implementation risk.
- Minimal structural change.

Cons:
- Still feels closer to an internal demo shell than the requested reference.

### Option B: Rebuild the homepage as a minimal Vercel-inspired hero with lightweight supporting cards

- Flatten the page into a near-white canvas with generous spacing.
- Center the hero content around one input and one CTA.
- Move the supporting product constraints into three low-contrast cards below the hero.
- Remove the stage strip and style gallery.

Pros:
- Matches the approved direction most closely.
- Keeps the page focused on the single primary action.
- Still avoids changing the underlying app contract.

Cons:
- Larger homepage-only layout change.

### Option C: Keep the existing structure but swap in Vercel-like colors and typography only

- Preserve current layout sections.
- Update only visual styling and copy tone.

Pros:
- Very small change.

Cons:
- Misses the requested structural simplification.

## Recommendation

Choose Option B.

It gets the homepage much closer to the approved reference without touching any job, route, or result behavior.

## Design

### Hero

- Use a flat `#fafafa` page background with a faint ambient gradient glow behind the hero only.
- Add a minimal top brand line: `Style Extractor`.
- Center the hero content.
- Include a small `Beta` pill above the headline.
- Use the headline:
  - `Design taste, extracted.`
- Use short supporting copy:
  - `Paste any public URL and get a DESIGN.md with colors, type, and system signals your agent can use.`
- Keep a single input and a single primary CTA in the center.
- Replace the current engineering-heavy labels with lighter product copy.

### Input Area

- Keep the existing form behavior and request submission logic.
- Restyle the form to feel lighter and more product-like:
  - pill-like input shell
  - dark compact CTA
  - subdued placeholder
- Change button label from `Generate DESIGN.md` to `Extract`.
- Change placeholder toward a reference-style example such as:
  - `Paste a URL like vercel.com...`
- Remove the visible `Website URL` label from the hero form and rely on the placeholder plus accessible label.

### Supporting Cards

- Place three equal-width cards below the hero.
- Use subtle borders, light surfaces, and almost no shadow.
- Re-express the current handoff model points with lighter product copy:
  - `One main DESIGN.md`
  - `Ships with imperfect coverage`
  - `Predictable exports`

### Removed Sections

- Remove the homepage `Async generation stages` section.
- Remove the homepage `Style gallery` section.
- Do not move either section elsewhere on the homepage.

## Content Direction

- Remove `Batch 1`, `framing layer`, and similar implementation-facing language.
- Keep the tone crisp, product-facing, and technically confident.
- Avoid uppercase-heavy labels except for small UI details such as the eyebrow card titles if needed.

## Testing Strategy

- Update homepage tests to assert:
  - the new hero headline
  - the URL input
  - the `Extract` CTA
  - the three supporting cards
- Keep the URL submission flow test intact while updating the CTA text expectation.
- Do not add result-page or API coverage because the route behavior is intentionally unchanged.

## Non-Goals

- No changes to `/api/jobs`.
- No changes to result generation or export tabs.
- No homepage navigation system build-out.
- No redesign of the results workbench.
