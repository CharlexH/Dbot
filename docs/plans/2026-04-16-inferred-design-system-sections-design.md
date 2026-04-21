# Inferred Design System Sections Design

**Goal:** Extend the results workbench so the left-hand design-system rail includes the reference site's richer section set, but every new section remains data-driven from the current extraction result instead of hardcoded showcase copy.

**Approach:** Keep the existing observed fields (`palette`, `typography`, `spacing`, `shadows`, `borderRadii`, `componentPreviews`, `guidelines`, `partitions`) as the source of truth. Add a derived layer that turns those observed signals into richer inferred sections for `Buttons`, `Icons`, `Spacing`, `Material`, `Motion`, and `Rendering`, while preserving the current `Typography`, `Colors`, `Visual DNA`, `Component Language`, and `Usage Guidelines` blocks.

**Design Principles:**
- Preserve evidence fidelity: when a section is inferred rather than directly observed, the copy should stay conservative.
- Reuse one derived model across the UI and export artifacts.
- Keep existing content visible; new sections extend the rail instead of replacing current cards.
- Prefer structural summaries and measured values over decorative placeholder text.

**Section Strategy:**
- `Buttons`: infer style count, primary CTA tone, label examples, and interaction language from `componentPreviews`, palette, radii, and guidelines.
- `Icons`: infer icon presence/family/tone conservatively from preview labels, palette contrast, and chrome style; fall back to “minimal system icons” when evidence is weak.
- `Spacing`: map the extracted spacing tokens into a base unit, scale, common gaps, and likely card padding.
- `Material`: summarize surface treatment from shadows, border radii, palette contrast, and guidelines; include border/shadow/radius callouts.
- `Motion`: present inferred motion guidance from overall brand tone and component density; keep the wording clearly directional rather than falsely precise.
- `Rendering`: summarize whether the system reads as DOM-first or graphics-heavy using the available component/evidence signals; only claim WebGL-like behavior when the evidence strongly supports it.

**Output Shape:**
- Add a derived design-system structure to the result model.
- Include that structure in `Design JSON`, `Design Tokens`, and `DESIGN.md`.
- Render the new sections after the current five cards inside the left rail.

**Risk Management:**
- Do not invent implementation-level specifics such as exact icon library or animation code unless the source signals support it.
- Avoid replacing existing result fields so downstream API/tests stay stable.
