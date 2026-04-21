# Light Linear Refresh Design

**Goal:** Rework the homepage, results workbench, and shared surface styling so the product feels closer to Linear's typography and restraint, but in a bright, white-led visual system.

## Scope

- Cover homepage, results page, and shared visual components.
- Keep route, job lifecycle, results contract, stage names, and export tab names unchanged.
- Keep homepage and results information architecture intact.
- Refresh only presentation, spacing, typography, and control styling.

## Current Problem

The current UI reads too large and too soft:

- warm off-white backgrounds make the product feel editorial instead of precise
- cards rely on bigger radii and more visible shadow than the intended direction
- buttons and pills feel rounded and landing-page-like rather than product-like
- typography hierarchy is looser and airier than the desired Linear-inspired tone

The next useful step is to standardize a tighter bright visual system across shared tokens and both major surfaces.

## Approach Options

### Option A: Token-only refresh

- Update global colors and spacing tokens.
- Leave page-specific layout and controls mostly unchanged.

Pros:
- Lowest risk.
- Fast to implement.

Cons:
- Does not fully solve the oversized, soft feeling.

### Option B: Token refresh plus component and page tightening

- Update global tokens.
- Tighten shared cards, buttons, inputs, tabs, and badges.
- Reduce page-level padding, copy density, and oversized radii.

Pros:
- Matches the requested direction.
- Keeps structure stable while improving the overall product feel.

Cons:
- Touches more files.

### Option C: Full Linear dark-mode adaptation

- Rebuild the app around a dark palette close to the reference.

Pros:
- Closest to raw Linear.

Cons:
- Conflicts with the approved bright direction.

## Recommendation

Choose Option B.

It preserves the app's structure while making the style system feel intentionally product-like instead of demo-like.

## Visual System

### Color

- Shift the global background from warm beige to cool near-white.
- Use a bright neutral canvas such as `#f7f8fa`.
- Use pure or near-pure white cards on top of the canvas.
- Use a cool dark text color in the `#111827` to `#171717` range.
- Use muted gray copy around `#6b7280`.
- Keep borders light and thin around `#e5e7eb`.
- Remove saturated accent dependence from everyday UI.

### Typography

- Keep headlines bold and tight with negative tracking.
- Reduce oversized card title/body pairings.
- Use denser body copy and calmer supporting text.
- Keep uppercase utility copy only where it helps orient the user.

### Shape and Elevation

- Reduce exaggerated corner rounding.
- Cards should land around `8px-12px`.
- Buttons and inputs should land around `6px-10px`.
- Remove glow treatments and most visible shadow.
- Separate layers primarily through borders and tonal change.

## Shared Components

### Section cards

- Tighten padding.
- Reduce radius.
- Remove shadow-heavy presentation.
- Keep eyebrow text lighter and smaller.

### Buttons and tabs

- Replace pill-heavy controls with smaller-radius product controls.
- Keep primary CTAs dark with white text.
- Keep secondary/tab states pale with subtle borders or neutral fills.

### Inputs

- Reduce height and corner rounding.
- Remove marketing-shell heaviness.
- Make the input feel like an application control rather than a campaign form.

## Homepage

- Keep the current hero plus three supporting cards structure.
- Tighten hero spacing and reduce oversized softness.
- Keep the headline prominent but slightly more controlled.
- Make the form more compact and product-like.
- Keep the bright background and subtle ambient gradient, but reduce visual bloom.

## Results Workbench

- Preserve the existing summary plus two-column layout.
- Tighten top summary density.
- Reduce card paddings and badge rounding.
- Make export tabs feel more like product tabs and less like soft pills.
- Keep the 50/50 desktop split and `md` breakpoint already approved.

## Testing Strategy

- Update homepage tests to assert the refined hero form/control styling hooks.
- Update workbench tests to assert the tighter export-tab and result-column styling hooks.
- Keep all existing behavior tests intact.

## Non-Goals

- No route changes.
- No lifecycle changes.
- No export-tab renaming.
- No dark-mode rebuild.
