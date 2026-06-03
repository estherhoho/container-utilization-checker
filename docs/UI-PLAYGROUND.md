# UI Interface Playground — Container Utilization Checker / CBM Calculator

## Overview

This Interface Playground presents 3 genuinely distinct UI/UX directions for the Container Utilization Checker tool at `/tools/ocean-import/container-utilization-checker`.

Esther confirmed 3 options (not 5). Each option differs in layout strategy, interaction model, component density, navigation model, and target user fit. These are not color variants — they represent three different product philosophies for the same tool.

**Approval required from Esther before Developer builds.** Review all three options, select one (or specify a combination), and Developer will build the final UI from the selected spec.

---

## Option A — The Calculator

**Subtitle:** Minimal single-column calculator — utilitarian, form-first, result inline below

---

### Intended Feeling

Functional, fast, no-nonsense. Feels like a well-built spreadsheet tool or a shipping rate calculator — familiar to operations and logistics users who just want an answer. Trust comes from clarity, not decoration.

---

### Layout Strategy

Single centered column, max-width 640px, vertically stacked. Form sits at the top. Results appear directly below the form when the user submits. No sidebars, no panels, no split-screen. The page scrolls naturally from input to output. On desktop the column is centered with generous left/right whitespace. On mobile it fills the full viewport width with 16px side padding.

Everything is on one URL, one scroll position, one mental model: fill in → calculate → read result.

---

### Screen Structure

**Section 1 — Header (compact)**
- Tool name: "Container Utilization Checker"
- One-line description: "Calculate CBM, payload, and container fit for your ocean shipment."
- No hero image, no marketing copy.

**Section 2 — Carton Dimensions Form**
- Ant Design `Form` with `Form.Item` labels above each field.
- Three inline fields on one row: Length / Width / Height, each with a right-aligned unit toggle (`cm` / `in`) using `Select` (small size, inline).
- Below: Quantity field (full width), Gross weight per carton with `kg` / `lb` toggle.
- Container type: `Radio.Group` with three buttons: 20GP / 40GP / 40HQ. Default 40GP pre-selected.
- Stackable: `Switch` with label "Stackable?" Default on.
- Optional fields collapsed under `Collapse` panel labeled "Optional: Shipment name, category, value" — closed by default, no visual noise.
- Primary CTA: `Button` type="primary", full-width, label "Calculate Fit". Large enough for thumb tap (min 48px height).

**Section 3 — Result Card (appears after submit, inline below form)**
- Ant Design `Card` component, border-radius 8px, no shadow on mobile.
- Top of card: always-visible disclaimer `Alert` component, type="info", no icon, small text: "Planning estimate only. Confirm with your forwarder before booking. Actual container capacity depends on carton geometry, loading method, pallets, and destination weight limits."
- Row 1: "Can it fit?" — large color-coded badge. Green = FIT, Red = DOES NOT FIT, Orange = TIGHT.
- Row 2: Best container recommendation — plain text with bold container name.
- Row 3: Volume utilization % — `Progress` bar (strokeColor mapped to band: blue=under, green=healthy, orange=tight, red=over), with band label below ("Healthy", "Tight", etc.)
- Row 4: Payload utilization % — second `Progress` bar, same color logic.
- Row 5: Rule-based recommendation text — `Alert` with appropriate type (success/warning/error). Text rendered from R1–R14 rules. Multiple alerts stack vertically if multiple rules fire.
- Row 6: Supporting detail — collapsible `Descriptions` table showing CBM total, carton count, container specs, wasted space in CBM.
- Secondary CTAs: Two `Button` components, type="default", disabled=true. Labels: "Generate supplier email draft" and "Download utilization report". Each with `Tooltip` on hover/focus: "Coming in v1.1". Visually styled as disabled text links, not prominent buttons — they must not look broken.

**Section 4 — Reset**
- Small text link below result: "Start over" — scrolls to top and clears form.

---

### Key Components

- `Form`, `Form.Item` (Ant Design) — input layout and validation
- `Input` with `addonAfter` or right-aligned `Select` for unit toggles — cm/in, kg/lb
- `Radio.Group` with `Radio.Button` — container type selection
- `Switch` — stackable toggle
- `Collapse` — optional fields
- `Button` (primary + disabled default) — CTA and disabled secondary actions
- `Tooltip` — "Coming in v1.1" on disabled buttons
- `Card` — result wrapper
- `Alert` (info, success, warning, error) — disclaimer and rule-based recommendations
- `Progress` — utilization bars
- `Descriptions` — supporting detail table
- HTML `<section>` landmark elements for accessibility

---

### Form UX

- Field-level validation: inline error messages below each field on blur. Red border on invalid field.
- Unit toggles are small `Select` dropdowns (size="small") placed inside the input's suffix or addonAfter slot. They do not cause layout reflow.
- Changing a unit toggle converts the displayed value and adjusts placeholder text.
- Carton dimension fields on mobile: three fields in a 3-column `Row`/`Col` grid, each col spans 8. On 375px viewport all three fit without horizontal scroll.
- Quantity and weight are full-width fields with clear numeric input type (inputmode="numeric").
- Container type radio group wraps on narrow screens — no horizontal scroll.
- "Calculate Fit" button is sticky at bottom on mobile when form is long (CSS `position: sticky`, `bottom: 16px`) — so user does not have to scroll back up to submit.

---

### Result UX

- Result card animates in with a subtle fade + translate-up (150ms, no bounce). Does not jump the page.
- "Can it fit?" badge is the largest visual element in the result. Color is unambiguous: green (#52C41A), orange (#FA8C16), red (#FF4D4F).
- Both utilization bars have a text label showing the percentage and band classification.
- Rule-based recommendation copy is plain English, short sentences. No jargon.
- Canonical values (CBM in m³, weight in kg) are shown in the supporting detail section even if user entered imperial units.
- Hard-fail state (R13, R7, R11) renders the result card with a red top border and the "DOES NOT FIT" badge. No utilization bars shown — they are irrelevant.

---

### Navigation Model

Single page, single scroll. No tabs, no routing, no back button needed. User stays on the same URL throughout. Result is revealed in-page, not navigated to.

---

### Color/Typography Direction

- Background: #F5F7FA (light gray page background)
- Card background: #FFFFFF
- Primary blue: #1677FF (Ant Design default primary)
- Typography: Inter. Body 14px/1.6. Form labels 13px medium. Result headings 16px semibold. "Can it fit?" badge 20px bold.
- Status colors follow Ant Design semantic palette: green, orange, red — consistent with standard SaaS conventions.
- No gradients, no illustrations. Clean borders (#E8E8E8).

---

### Interaction Style

Synchronous, linear. Fill in → submit → read. No real-time preview, no live calculation as user types (adds confusion for partial input). After first submit, a "Recalculate" button replaces "Calculate Fit" so user knows they can adjust and rerun.

Keyboard navigable: tab order follows visual order top to bottom. Enter in last field triggers submit.

---

### Accessibility Notes

- All form fields have explicit `<label>` associations via `Form.Item`'s `htmlFor`.
- Color is never the sole indicator of status — badges include text ("FIT", "DOES NOT FIT", "TIGHT").
- `Progress` bars have `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a visible text label.
- Disabled buttons are rendered as `<button disabled>` with `aria-disabled="true"` and a `title` attribute matching the tooltip text, so screen readers announce "Coming in v1.1".
- Disclaimer `Alert` has `role="note"` to distinguish it from action-required alerts.
- Touch targets: minimum 44×44px for all interactive elements.
- Contrast ratio: all text meets WCAG AA (4.5:1 for body, 3:1 for large text).

---

### Implementation Complexity: Low

No routing, no split layout, no animation library, no charting. Standard Ant Design form + card. A mid-level React developer can build this in 2–3 days including the rule engine. The rule engine (R1–R14) is the only complex logic — the UI itself is straightforward.

---

### Pros

1. Fastest to build and ship. Minimal component surface area means fewer bugs and easier QA.
2. Most forgiving on mobile. Single column adapts cleanly to 375px without layout rewrites.
3. Lowest cognitive load. Users who want an answer fast are not interrupted by navigation, tabs, or visual complexity.
4. Easiest to iterate. Adding fields or rule outputs does not require layout rethinking.

---

### Risks

1. Result card can get long if multiple rules fire (stacked alerts). Needs a clear visual hierarchy to prevent scan fatigue.
2. Less visually impressive in a marketing context. May not feel "product-grade" to users who judge tools by visual polish.
3. Supporting detail section (CBM breakdown) is behind a collapse — some users may miss it.

---

### Best-Fit User

SMB ecommerce importer or FBA seller who checks container fit periodically, often from their phone, and wants a fast answer without learning a new interface. Also suitable for freight forwarder CS reps who run quick estimates during client calls.

---

### Why It's Different from Options B and C

Option A has no persistent layout chrome (no sidebar, no fixed header nav). It does not split the screen or use a step-by-step wizard. There is no charting library. The interaction model is the simplest possible: one form, one submit, one result below. Options B and C both require more component surface area and present the result in a different spatial relationship to the form.

---

## Option B — The Dashboard

**Subtitle:** Two-column dashboard — result cards with supporting chart visualization

---

### Intended Feeling

Professional SaaS tool. Feels like a lightweight operations dashboard — similar to a freight analytics portal or a logistics software tool. Trust comes from data density and visual structure. Users feel informed, not just answered.

---

### Layout Strategy

Two-column layout on desktop (min 1024px): left column (40%) holds the input form in a sticky panel; right column (60%) shows results. On tablet (768px–1023px): the left column collapses to full width above the result area. On mobile (< 768px): fully stacked, form on top, results below — identical to Option A in narrow viewports.

The split layout means results are always visible alongside the form on desktop, enabling a "tweak and compare" workflow without scrolling.

---

### Screen Structure

**Fixed Header Bar (full width)**
- Tool name + breadcrumb: "Tools / Ocean Import / Container Utilization Checker"
- No marketing copy in the header.
- `Layout.Header` component, height 56px, white background with bottom border.

**Left Panel — Input Form (sticky on desktop)**
- `Layout.Sider` equivalent, implemented as a sticky `Col` with `position: sticky; top: 72px`.
- Ant Design `Form` with section headers: "Carton Dimensions", "Container Settings", "Optional Details".
- Section headers are small caps labels (11px uppercase, letter-spacing 0.08em) acting as visual dividers.
- Unit toggles: `Segmented` component (not `Select`) — shows `cm` / `in` as pill tabs side by side within the field row. More visually clear that these are toggle options.
- Container type: `Select` dropdown (not radio buttons) — saves vertical space in the constrained left column.
- Stackable: `Switch` with inline label.
- Optional section: visible by default (not collapsed) but fields are clearly secondary — lighter label color (#8C8C8C).
- CTA: `Button` type="primary", full-width, "Calculate Fit". Not sticky — user is in a two-panel layout so the form is always in view.

**Right Panel — Result Area**
- Default state (before submit): Illustrated empty state. A simple line-art graphic of a container with text "Enter carton dimensions to see fit analysis." No animation.
- After submit: Results render as a 2×2 grid of `Statistic` cards plus a full-width visualization row.

**Result Card Grid (2×2 on desktop, 1-col on mobile)**
- Card 1: "Container Fit" — large status text (FIT / DOES NOT FIT / TIGHT) with color badge and recommended container name.
- Card 2: "Volume Utilization" — `Progress` circle (type="circle"), percentage in center, band label below.
- Card 3: "Payload Utilization" — second `Progress` circle, same treatment.
- Card 4: "CBM Summary" — `Statistic` showing total CBM, container CBM, wasted CBM. Three stacked `Statistic` items.

**Visualization Row (full width below grid)**
- Horizontal stacked bar chart showing: used volume (colored by band) vs. wasted volume. Built with Ant Design Charts (`@ant-design/charts`) or lightweight `recharts`. Width 100% of right panel.
- Second row: same chart for payload weight.
- This is the key differentiator of Option B — visual representation of how full the container is.

**Recommendation Strip (below visualization)**
- Full-width horizontal `Alert` band for each firing rule. Stacked vertically. Each alert has an icon (info, warning, error) and a one-sentence recommendation.
- Disclaimer `Alert` is pinned at the very top of the right panel result area — always visible once results load.

**Secondary CTAs Row**
- Two `Button` components, type="dashed" (dashed style signals "not yet available" without looking broken), disabled=true, with `Tooltip` "Coming in v1.1".
- Placed in a right-aligned row at the bottom of the result area.

---

### Key Components

- `Layout`, `Layout.Header`, `Row`, `Col` — two-column page structure
- `Form`, `Form.Item` — input layout
- `Segmented` — unit toggles (cm/in, kg/lb)
- `Select` — container type dropdown
- `Switch` — stackable toggle
- `Button` (primary + dashed disabled) — CTAs
- `Tooltip` — disabled button labels
- `Card` — result metric cards
- `Statistic` — numeric metric display (CBM values, container specs)
- `Progress` type="circle" — utilization visualization
- `Alert` — disclaimer + rule recommendations
- `@ant-design/charts` `Bar` or `recharts` `BarChart` — stacked utilization bar chart
- `Empty` — empty state illustration in right panel

---

### Form UX

- Left panel form stays in view on desktop as user reads results on the right — no scrolling required to adjust a value and recalculate.
- `Segmented` unit toggles are more visually clear than `Select` dropdowns for binary options. Show `cm` and `in` as two pill buttons; active state uses primary blue fill.
- Validation errors appear inline below each field (same as Option A).
- After submit, a "Recalculate" label replaces the button text. The button does not change size or position — no layout shift.

---

### Result UX

- The 2×2 card grid gives users four scannable data points at a glance — no need to read a linear text flow.
- Circular progress bars are more space-efficient than linear bars in a grid layout and communicate "how full is it" intuitively.
- The stacked bar chart adds a visual anchor for the percentage numbers — users who are visual thinkers get an immediate sense of scale.
- Hard-fail state: Cards 2 and 3 (utilization circles) are hidden. Card 1 shows the hard-fail reason (oversized carton, overweight). The chart area shows a single red "DOES NOT FIT" text block.
- Canonical (m, kg) values are shown in Card 4 without requiring a collapse.

---

### Navigation Model

Single page with a persistent two-column layout. No routing changes on submit. The URL could optionally accept query params for shareable results (e.g., `?l=60&w=40&h=50&q=100&unit=cm&ct=40GP`), but this is optional for MVP. No tabs, no wizard steps.

---

### Color/Typography Direction

- Left panel background: #FAFAFA (slightly off-white to visually separate from right panel)
- Right panel background: #FFFFFF
- Header: #FFFFFF with `#F0F0F0` bottom border
- Card borders: #E8E8E8, border-radius 8px
- Chart colors: primary blue (#1677FF) for used volume, light gray (#F0F0F0) for wasted space. Payload bar uses a secondary blue-green.
- Typography: Inter. Dashboard card values: 24px bold. Labels: 12px medium. Form labels: 13px medium.
- Status badge backgrounds: same semantic palette as Option A (green/orange/red).

---

### Interaction Style

Parallel visibility: form and result coexist on screen at the same time on desktop. After submit, results render in-place on the right with a brief fade-in (200ms). User can immediately change any input field on the left and hit Recalculate without scrolling.

No real-time calculation. Submit is still explicit (no auto-calculate on field change) to avoid confusing partial-input states.

---

### Accessibility Notes

- Two-column layout uses `role="complementary"` on the right result panel and `role="form"` on the left input panel.
- Circular progress bars (`Progress` type="circle") must have `aria-label` describing the metric and value, since the visual encoding is not text.
- Chart component must have a `<table>` fallback or `aria-label` describing what the chart shows, per WCAG 1.1.1.
- On mobile (stacked), the reading order is form first, results second — correct for screen readers.
- Focus management: when results load, announce to screen readers via `aria-live="polite"` region on the right panel.
- `Segmented` unit toggles must convey selected state to assistive technology (`aria-pressed` or role="radio" group).

---

### Implementation Complexity: Medium

The two-column sticky layout adds CSS complexity. The chart library (`@ant-design/charts` or `recharts`) adds a dependency and requires responsive configuration. The `Segmented` component and circular progress bars are slightly more complex to style and test than Option A's linear equivalents. Estimated build time: 4–5 days for a mid-level React developer.

---

### Pros

1. Desktop power users can adjust inputs and immediately see results side by side — no scrolling friction.
2. Circular progress and bar chart make utilization data visually compelling and easy to share as a screenshot.
3. Professional, SaaS-grade appearance supports brand credibility for Dock to AI as a product company.
4. `Statistic` cards make all key numbers visible at once — no collapsing required.

---

### Risks

1. Two-column layout requires careful responsive breakpoint handling. A poorly implemented mobile collapse looks bad and undermines trust.
2. Adding a chart library increases bundle size and introduces a dependency that needs maintenance.
3. Overkill for users who just want a binary "fit or not" answer — they may find the dashboard density distracting.

---

### Best-Fit User

Warehouse or ops manager who runs this tool regularly and wants to compare utilization across multiple configurations. Also suits a freight-forwarder CS rep who screenshots results to share with clients. Users who value data density and visual proof over minimal UX.

---

### Why It's Different from Options A and C

Option B is the only option with a persistent two-column layout and a data visualization component. It treats the result area as a live dashboard panel, not an inline answer or a new screen. The interaction model allows simultaneous visibility of inputs and outputs on desktop — Options A and C both require a scroll or a step transition to see results alongside the form.

---

## Option C — The Stepper

**Subtitle:** Mobile-first card stack — step-by-step wizard with full-screen result card

---

### Intended Feeling

Modern, guided, and mobile-optimized. Feels like a well-designed mobile tool or a self-serve checkout flow. Each step is focused — no visual noise from unrelated fields. Trust comes from structure and progress, not data density.

---

### Layout Strategy

Full-viewport step-by-step wizard. Each step occupies the full screen (100vw × 100dvh on mobile). Steps are navigated forward and backward with a prominent "Next" / "Back" button. On desktop, the wizard is presented as a centered card (max-width 540px) with a white background on a light gray page — the step transitions still apply.

No persistent sidebar. No result visible until Step 3. The user's mental model is: "I'm answering three questions, then I get my answer."

---

### Screen Structure

**Step Progress Bar (persistent, top of viewport)**
- Ant Design `Steps` component, size="small", 3 steps: "Dimensions" → "Container" → "Result".
- `Steps` is positioned at the top of the card, above step content.
- On mobile: `Steps` in "dot" variant to save vertical space. Step labels appear below dots. Current step is highlighted.
- The step bar does not disappear between steps — it is always visible so users know where they are.

**Step 1 — Carton Dimensions**
- Full-screen card (within max-width container on desktop).
- Step heading: "Tell us about your cartons" (16px semibold, #262626).
- Fields: Length, Width, Height (three fields in one row, each with unit toggle), Quantity, Gross weight per carton with unit toggle.
- Unit toggles: `Segmented` (same as Option B) — `cm` / `in` and `kg` / `lb`.
- All fields on one screen. No collapse. This step is purely about carton data.
- Validation happens on "Next" tap — fields are validated before allowing step transition.
- Footer: "Next: Container Settings →" (`Button` type="primary", full width, 48px height). No "Back" on Step 1 (there is nothing before it).
- Subtle carton dimension diagram illustration (SVG, inline) showing L/W/H labeled — helps users who are unsure which dimension is which. Small, decorative, not required to understand the tool.

**Step 2 — Container Settings**
- Step heading: "Choose your container".
- Fields: Container type (`Radio.Group` with large radio cards — each card shows container name, CBM, and payload limit as supporting text), Stackable (`Switch`), Optional fields (Shipment name, category, value — visible by default, clearly marked as "Optional").
- Container type radio cards are the visual centerpiece of this step. Each card is ~80px tall, full width, shows:
  - Container name (20GP / 40GP / 40HQ) — bold
  - Internal volume: X CBM
  - Max payload: X,XXX kg
  - Selected state: primary blue border + checkmark icon
- This step is short — user makes one key choice (container type) and can go straight to results.
- Footer: "← Back" (text link, left-aligned) and "Calculate →" (`Button` type="primary", right-aligned, 48px height).
- "Calculate →" triggers the calculation before navigating to Step 3.

**Step 3 — Result**
- Step heading changes dynamically: "Your container fits." (green) / "Your container is tight." (orange) / "Your carton does not fit." (red).
- This step is a full-screen result experience — not a card within a form.
- Top: Disclaimer `Alert` (type="info", no icon, small text). Always visible.
- Primary result block: large color-coded "FIT" / "TIGHT" / "DOES NOT FIT" badge (32px bold), container recommendation text below it.
- Two linear `Progress` bars: Volume utilization, Payload utilization. Each with percentage text and band label.
- Rule recommendation `Alert` stack: each firing rule renders as one alert. Stacked vertically.
- Supporting detail: `Descriptions` component showing CBM, weight, container specs, wasted space. Visible by default — no collapse needed since the user is now on a dedicated result screen with no form competing for space.
- Secondary CTAs: `Button` type="default" disabled=true with `Tooltip` "Coming in v1.1". Styled as ghost buttons (not dashed, not filled) — clearly secondary to the result.
- Footer: "← Recalculate" (text link back to Step 1, clears form). "Start new calculation" button.

**Between-Step Transitions**
- CSS slide transition: 300ms ease-out. Next step slides in from right. Back step slides in from left.
- On mobile: this mimics native app navigation patterns — familiar to smartphone users.
- On desktop: transition is subtle (fade + slight translate). Not distracting.

---

### Key Components

- `Steps` (Ant Design) — step progress indicator at top of card
- `Form`, `Form.Item` — input layout within each step
- `Segmented` — unit toggles (cm/in, kg/lb)
- `Radio.Group` with custom `Radio.Button` styled as info cards — container type selection in Step 2
- `Switch` — stackable toggle
- `Button` (primary, text, ghost disabled) — navigation and CTAs
- `Tooltip` — "Coming in v1.1" on disabled buttons
- `Alert` (info, success, warning, error) — disclaimer and recommendations
- `Progress` (line) — utilization bars
- `Descriptions` — supporting detail
- CSS transitions (or `framer-motion` if Developer prefers) — step slide animation
- SVG illustration (inline) — carton dimension diagram in Step 1

---

### Form UX

- Each step contains only the fields relevant to that step — no cognitive overhead from unrelated fields.
- Step 1 is entirely about carton data. Step 2 is entirely about container preferences. This mirrors how a user actually thinks: "First I know my carton. Then I choose my container."
- Validation fires on "Next" / "Calculate" button tap, not on blur. This reduces premature error messages on a mobile-first flow.
- The "Calculate →" label on the Step 2 CTA makes it clear that pressing it produces a result — no ambiguity about what happens next.
- Users cannot jump to Step 3 directly — they must complete Steps 1 and 2. This ensures the calculation always has valid inputs.

---

### Result UX

- The result lives on its own full-screen step — no form competing for visual space. All result data is visible without scrolling on most mobile viewports.
- The step heading dynamically summarizes the result ("Your container fits.") — the user knows the answer before they even read the card.
- Supporting detail (`Descriptions`) is not collapsed because the result step has full viewport space and no form elements.
- Hard-fail state (R13, R7, R11): step heading is "Your carton does not fit." in red. No utilization bars. A single large red `Alert` with the specific failure reason (oversized dimensions, overweight). "← Recalculate" is prominent.
- "Recalculate" returns to Step 1 with form values pre-filled from the previous calculation — user only changes what they need to.

---

### Navigation Model

Wizard/stepper navigation. Forward-only by default (Steps 1 → 2 → 3), with a "Back" option to return to previous steps. Each step is a distinct UI state — conceptually similar to a page, but implemented as a single-page component with state transitions.

No URL changes per step (MVP). Optionally, steps could use URL hash (`#step-1`, `#step-2`, `#result`) for browser back-button support, but this is a post-MVP enhancement.

---

### Color/Typography Direction

- Step card background: #FFFFFF
- Page background: #F5F7FA
- `Steps` progress bar: uses Ant Design's default primary blue for completed/current steps, gray for upcoming steps.
- Container radio cards (Step 2): default border #D9D9D9, hover border #1677FF, selected border #1677FF with #EFF6FF background fill.
- Result step heading: dynamically colored (#52C41A / #FA8C16 / #FF4D4F) based on fit status.
- Typography: Inter. Step headings: 18px semibold. Field labels: 13px medium. Result heading: 24px bold. Container card names: 16px semibold. Support text (CBM/payload in cards): 12px regular #8C8C8C.
- No illustrations beyond the optional carton dimension SVG in Step 1.

---

### Interaction Style

Guided and sequential. User is walked through the input process in two focused steps, then presented with a dedicated result experience. The transition animation reinforces the sense of progression.

The wizard model is deliberate: it removes the option of overwhelming a new user with a full form. Each step has one primary question. This is the most hand-holding of the three options.

The "Recalculate" action pre-fills Step 1 with previous values, making it easy to adjust one carton dimension and rerun — a key use pattern for operators comparing packing configurations.

---

### Accessibility Notes

- `Steps` component: current step must have `aria-current="step"`. Completed steps must communicate their status to screen readers.
- Step transitions must not auto-focus the new step heading until the transition completes, then `focus()` the step heading element programmatically.
- On step transition, old step content must have `aria-hidden="true"` applied after transition completes — not before (avoids premature removal from accessibility tree).
- Container radio cards (custom styled) must use `role="radio"` within a `role="radiogroup"` and support keyboard navigation (arrow keys to switch between options).
- "Back" and "Next" buttons must be reachable by Tab in the correct order.
- The SVG carton illustration must have `aria-hidden="true"` (decorative) or `role="img"` with a descriptive `aria-label`.
- Animation: `prefers-reduced-motion` media query must disable or reduce slide transitions to a simple fade.

---

### Implementation Complexity: Medium

The wizard step management requires a state machine or React `useState`-based step controller. Step transitions require CSS animation or a library like `framer-motion`. Container type radio cards require custom styling beyond default Ant Design `Radio.Button`. Estimated build time: 4–5 days for a mid-level React developer. The result experience is actually simpler than Option A's result card because supporting details do not need to be collapsed.

---

### Pros

1. Best mobile experience of the three options. Each step fits comfortably on a 375px screen with no scrolling required.
2. Lowest input cognitive load. Users see only the fields relevant to the current step — no form scanning required.
3. Container type radio cards (with CBM and payload specs visible) help users make an informed selection without external research.
4. Result step has full-screen real estate — no competing form elements, all data visible at once on mobile.

---

### Risks

1. Step-by-step flow adds friction for repeat users who know exactly what they want to input. Power users may find the wizard slower than a single-page form.
2. Step transitions and custom radio cards increase implementation complexity and testing surface area.
3. Users cannot see their form inputs while reading results — if they want to verify what they entered, they must go back to Step 1.

---

### Best-Fit User

SMB ecommerce importer or FBA seller who is relatively new to container planning and benefits from a guided, step-by-step experience. Also strong for mobile-primary users who check container fit from a phone while at a warehouse or supplier facility. Not ideal for power users who run many configurations per session.

---

### Why It's Different from Options A and B

Option C is the only wizard-model option. It deliberately hides the result until Step 3 and structures the input process as two distinct questions. The full-screen result step is unique — in Options A and B, the result competes for visual space with the form. Option C also has the only animated step transition. The navigation model (Back/Next within a step container) is fundamentally different from Options A and B's scroll-based single-page model.

---

## Recommendation

**Recommended Option: Option A — The Calculator**

Rationale:

1. **Fastest to ship.** Option A has the smallest component surface area. No chart library, no two-column layout, no step controller. A developer can build and QA this in 2–3 days versus 4–5 for B or C.

2. **Best mobile coverage.** Single-column layout adapts cleanly to 375px. No responsive breakpoint bugs, no two-column collapse edge cases, no step animation issues on slow devices.

3. **Lowest cognitive load for SMB users.** The target users (FBA sellers, ops managers) visit this tool for a fast answer, not a product experience. Option A delivers the answer with minimum friction.

4. **Easiest to iterate.** When v1.1 features (email draft, PDF report) are ready, they slot in as enabled buttons with no layout change. Adding a new field or rule output does not require restructuring the page.

Option B is the right choice if Dock to AI wants to position this tool as a premium, data-rich product feature visible on a desktop-first internal tool or portal. Option C is the right choice if the primary distribution is mobile and users are first-time container planners who benefit from guidance.

**Esther: please confirm your selection before Developer begins. See the approval checklist below.**

---

## Static HTML Preview Plan

If Developer creates selectable static HTML previews, the following structure applies:

**Option A preview** — filename: `preview-option-a-calculator.html`
- Single centered column, 640px max-width
- Static form with all input fields rendered (pre-filled with sample data: 60cm × 40cm × 50cm, 100 cartons, 18kg, 40GP, stackable)
- Static result card below form showing sample output: FIT, 75% volume, 62% payload, healthy band, two alerts
- Disclaimer visible at top of result card
- Disabled secondary CTA buttons with tooltip text visible

**Option B preview** — filename: `preview-option-b-dashboard.html`
- Two-column layout (40/60 split)
- Left: static form with same sample data
- Right: 2×2 Statistic cards + circular progress bars (rendered as SVG circles at 75% and 62%) + a static horizontal bar chart image or SVG
- Header bar with breadcrumb
- Recommendation alerts below chart

**Option C preview** — filename: `preview-option-c-stepper.html`
- Three visible sections on one scroll (representing Step 1, Step 2, Step 3 stacked)
- Step 1: carton dimension fields
- Step 2: container type radio cards showing 20GP / 40GP / 40HQ with specs
- Step 3: full result card with fit badge, progress bars, recommendations
- Steps progress bar shown above each section to illustrate navigation state

All three previews should be placed in:
`/Users/estherho/sc_product/products/container-utilization-checker/outputs/ui-previews/`

---

## Approval Required from Esther

- [ ] **Select one option** (A, B, or C) — or specify a combination (e.g., "Option A layout with Option C's container radio cards in Step 2")
- [ ] **Confirm static HTML previews needed** — should Developer build preview files before the final UI, or go straight to production React code?
- [ ] **Confirm optional fields default state** — should optional fields (Shipment name, category, value) be collapsed by default (Option A), visible but secondary (Option B), or visible on their own step?
- [ ] **Confirm disabled CTA styling approach** — ghost buttons (Option C style), dashed buttons (Option B style), or plain text links (Option A style) for "Coming in v1.1" buttons?
- [ ] **Confirm chart/visualization scope** — Option B includes a stacked bar chart. If Option A is selected, should any chart be added as an enhancement, or keep it chart-free?
- [ ] **Confirm pre-fill on recalculate** — should "Recalculate" pre-fill form with previous values, or always reset to blank?

---

## Developer Handoff

After Esther selects an option, Developer builds:

1. **React component** at route `/tools/ocean-import/container-utilization-checker`
2. **Form component** with all 7 MVP inputs (L/W/H with unit toggles, qty, weight with unit toggle, container type, stackable) + 3 optional fields
3. **Calculation engine** implementing R1–R14 rules with priority order: R13 > R7/R11 > R6/R10/R14 > R8/R9 > R1/R2/R12 > R3/R5 > R4. Returns: fit status, recommended container, volume %, payload %, firing rules list, supporting detail object.
4. **Result display component** rendering: fit badge, container recommendation, two utilization bars (or circles for Option B), stacked rule alerts, disclaimer alert (always first), supporting detail, disabled secondary CTAs with tooltips.
5. **Unit conversion utility** — converts cm↔in and kg↔lb; stores canonical values in kg and m internally; displays user-selected units in form, canonical units in result supporting detail.
6. **Container constants** — 20GP (33.0 CBM / 28,200 kg), 40GP (67.0 CBM / 26,700 kg), 40HQ (76.0 CBM / 26,500 kg) with internal dimensions.
7. **State management** — empty → loading (brief, 300ms artificial delay for UX) → success → hard-fail.
8. **Ant Design** as the component library. Use `@ant-design/icons` for status icons in alerts.
9. **Accessibility** — ARIA labels, live region for result announcement, keyboard navigation, prefers-reduced-motion support.
10. **Responsive behavior** — primary breakpoint 375px (mobile-first). Desktop enhancement at 1024px+ (for Option B: two-column layout).

Design artifacts for reference:
- This spec: `/Users/estherho/sc_product/products/container-utilization-checker/docs/UI-PLAYGROUND.md`
- Static HTML previews (if built): `/Users/estherho/sc_product/products/container-utilization-checker/outputs/ui-previews/`

---

## Bilingual Summary / 双语摘要

### English

- **Recommended option:** Option A — The Calculator. Single-column, form-first, result inline below. Fastest to build, most mobile-friendly, lowest cognitive load for SMB users.
- **Alternatives considered:** Option B (Dashboard, two-column layout with charts) for data-rich desktop experience; Option C (Stepper, wizard model) for guided mobile-first flow.
- **Esther approval needed:** Select one option (or specify combination). Confirm optional field default state, disabled CTA styling, chart scope, and pre-fill behavior. Confirm whether static HTML previews are needed before production build.
- **Developer builds next:** React component at `/tools/ocean-import/container-utilization-checker` with form, calculation engine (R1–R14), result card, unit conversion, container constants, and Ant Design components. Full state handling (empty / loading / success / hard-fail). Mobile-first responsive layout.

---

### 中文

- **推荐方案：** Option A — The Calculator（计算器模式）。单列布局，表单优先，结果内联显示在表单下方。构建速度最快，移动端适配最佳，对中小电商用户认知负担最低。
- **已考虑的替代方案：** Option B（仪表盘模式，双列布局含图表可视化），适合桌面端数据密集型展示；Option C（步骤引导模式，向导式交互），适合移动优先的引导型使用场景。
- **需要 Esther 批准：** 选择一个方案（或指定组合）。确认可选字段默认状态、禁用 CTA 按钮样式、是否需要图表、以及"重新计算"是否预填上次数值。确认是否需要在正式开发前先构建静态 HTML 预览文件。
- **Developer 下一步构建：** 在 `/tools/ocean-import/container-utilization-checker` 路由下构建 React 组件，包含：表单（7个MVP输入项+3个可选项）、计算引擎（R1–R14规则，按优先级顺序执行）、结果卡片（fit徽章、利用率进度条、规则提示、免责声明、禁用CTA）、单位换算工具、容器常量、Ant Design 组件体系。完整状态处理（空状态/加载中/成功/硬失败）。移动优先响应式布局，主断点375px。
