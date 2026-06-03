# UX Specification — Container Utilization Checker / CBM Calculator

**Version:** 0.2 MVP
**Tool URL:** `/tools/ocean-import/container-utilization-checker`
**Author:** UX Product Designer, Dock to AI Product Build Squad
**Date:** 2026-06-02
**Status:** Ready for Developer handoff

---

## 1. Target User & Jobs to Be Done

### 1.1 Primary User Segments

| Segment | Role | Context |
|---|---|---|
| SMB Ecommerce Importer | FBA seller or DTC brand owner | Booking a sea shipment from a Chinese factory; wants to know whether their carton count fills a container before committing to a container type or booking an LCL slot |
| Wholesale / Distribution Ops Manager | Mid-level logistics or purchasing ops | Planning inbound POs; needs to decide container type per SKU or per PO line and justify the choice to a supervisor |
| Warehouse / Ops Manager | Receives and plans outbound | Estimating whether an inbound container will fit in dock allocation; checking vendor packing against booking |
| Freight-Forwarder CS Rep (adjacent) | Customer-facing logistics rep | Running a quick estimate for a client before sending a formal quote; does not need PDF, needs a number fast |

### 1.2 Core Jobs to Be Done

1. **Fit check:** "Will my cartons physically fit in the container I am about to book?"
2. **Size selection:** "Which is the smallest container type that fits my shipment without wasting money?"
3. **Utilization awareness:** "How efficiently am I using the space I am paying for?"
4. **Weight sanity check:** "Am I under the payload limit, or do I have a weight problem?"
5. **Action guidance:** "What should I actually do with this result — book, upgrade, split, or call my forwarder?"

### 1.3 Non-Goals (v0.2 MVP)

- Not a freight rate calculator.
- Not a palletization planner.
- Not a booking or quoting tool.
- Not a multi-SKU or mixed-carton calculator.

---

## 2. Recommended User Flow

### 2a. Happy Path — Mobile (375px)

1. User arrives at `/tools/ocean-import/container-utilization-checker` from a search result, a Dock to AI article, or a direct share link.
2. Page loads with the form visible above the fold. Tool title, one-line description, and the first field group are visible. No results yet.
3. User taps **Carton Length** field. Keyboard opens. Field is focused (blue outline).
4. User types a number. Field shows valid state (no error).
5. User taps the unit toggle next to the length field (default: **cm**). Toggle switches to **in**. The other dimension fields auto-update their toggle to **in** as well (unit is synced across all three dimension fields).
6. User fills in **Carton Width** and **Carton Height**.
7. User scrolls to **Carton Quantity**. Types a positive integer.
8. User fills in **Gross Weight per Carton**, selects unit (**kg** or **lb**).
9. User selects **Container Type** from a segmented control or Select dropdown (default is **40GP**).
10. User selects **Stackable** toggle (default is **Yes**).
11. User optionally fills in **Shipment Name**, **Product Category**, **Shipment Value** — all optional, all clearly labeled "(optional)".
12. User taps **Check Container Fit** button.
13. Button enters loading state ("Calculating..." + spinner).
14. After ~400ms (client-side calculation), page scrolls to or reveals the **Result Card** directly below the form.
15. The **Disclaimer Strip** appears at the top of the result card — always visible.
16. The **Verdict Block** shows prominently: green "Fits" badge or red "Does Not Fit" badge.
17. The **Container Recommendation Block** names the recommended container type.
18. The **Utilization Score Block** shows volume % bar and payload % bar with colored band labels.
19. The **Action Recommendation Block** displays the highest-priority applicable rule message (R1–R14).
20. The **Supporting Detail Block** is collapsed by default on mobile (expandable with a "Show details" toggle).
21. The **Disabled CTA Section** appears at the bottom of the result card with muted, clearly unavailable buttons and "Coming in v1.1" badges.
22. User reads the result. They may tap "Recalculate" to return to the form with fields pre-filled (form scrolls back into view or expands).

### 2b. Happy Path — Desktop (1024px+)

1. User lands on the page. The page uses a two-column layout at 1024px and above: **form on the left**, **result panel on the right** (result panel shows an instructional empty state until calculation runs).
2. User fills in the form fields left-to-right, top-to-bottom. Unit toggles are inline, to the right of each input.
3. User clicks **Check Container Fit**.
4. Right panel transitions from empty state to result in place (no scroll required). A brief fade-in or slide-in animation plays on the result card.
5. All five result blocks are visible in the right panel simultaneously (no accordion on desktop — Supporting Detail is expanded by default).
6. Disabled CTAs appear at the bottom of the right panel.
7. User can immediately edit form fields on the left; the right panel shows a faint "Recalculate to refresh" hint if fields are changed after a result is visible.

### 2c. Error Path — Form Validation

1. User taps **Check Container Fit** without completing required fields.
2. Button does NOT trigger a loading state. Instead, the first invalid field scrolls into view and shows an inline error message below it (red text, red outline).
3. All other invalid fields also show errors simultaneously (not one at a time).
4. User corrects each field. As soon as a field becomes valid, its error clears immediately (on-change validation after first submit attempt).
5. Once all required fields are valid, the submit button becomes fully active again and user can re-submit.

### 2d. Error Path — Carton Too Large (R13 Hard Fail)

1. User submits a form where at least one carton dimension exceeds the container's internal dimension.
2. Loading state clears.
3. Result card appears with **red hard-fail verdict**: "Carton Does Not Fit — Dimension Exceeds Container Interior."
4. The Verdict Block shows the specific dimension that failed (e.g., "Carton height 2.8 m exceeds 40GP interior height 2.395 m").
5. Container Recommendation block: "No container in our standard range fits this carton without repackaging."
6. Action Recommendation: "Reduce carton height before booking. Contact your factory to repack. Standard 40HQ interior height is 2.698 m."
7. No utilization bars are shown (they are meaningless for a hard fail). The utilization block is replaced by a single explanatory note.
8. Disabled CTAs still appear.
9. R13 takes absolute priority over all other rules.

### 2e. Error Path — No Fit (R7 Volume Overflow)

1. User submits and the calculated CBM exceeds all available container volumes.
2. Loading state clears.
3. Result card: red verdict "Does Not Fit — Volume Exceeds All Standard Container Sizes."
4. Container Recommendation: "Volume exceeds 40HQ capacity (76.0 CBM). Consider splitting into multiple containers."
5. Action Recommendation displays R7 copy: "Split shipment into two or more containers, or reduce order quantity."
6. Utilization bars show >100% (bar fills to full red, overflow indicator).
7. Disabled CTAs appear.

### 2f. Error Path — Over Payload (R11)

1. Total gross weight exceeds the payload limit of the selected (or recommended) container.
2. Verdict remains "Fits (volume)" but a prominent **orange warning band** appears immediately below the verdict: "Weight Exceeds Payload Limit."
3. Container Recommendation still names the best-fit container but adds a payload warning badge.
4. Action Recommendation: R11 copy — "Total weight exceeds container payload. Split into two containers or reduce weight per container. Confirm with forwarder."
5. Utilization bars: Volume bar shows normal color; Payload bar shows red.

---

## 3. Form Structure

### 3a. Field Grouping and Order

**Group A — Carton Dimensions** (three fields in a row on desktop, stacked on mobile)
- Carton Length (cm/in toggle)
- Carton Width (cm/in toggle)
- Carton Height (cm/in toggle)

**Group B — Quantity**
- Number of Cartons (positive integer)

**Group C — Weight**
- Gross Weight per Carton (kg/lb toggle)

**Group D — Container Type**
- Container Type selector: 20GP / 40GP / 40HQ (segmented control, default 40GP)

**Group E — Stackable**
- Stackable: Yes / No toggle (default Yes)

**Group F — Optional Fields** (collapsed under an "Optional: Add shipment details" disclosure link on mobile; expanded inline on desktop below Group E)
- Shipment Name (text)
- Product Category (text or short select)
- Shipment Value (number, currency note USD)

Groups A–E are required. Group F is entirely optional and skippable.

### 3b. Label Copy and Inline Help Text

**Group A — Carton Dimensions**

| Field | Label | Placeholder | Helper Text |
|---|---|---|---|
| Length | Carton Length | e.g. 60 | Measure the outside of the shipping carton, not the product |
| Width | Carton Width | e.g. 40 | — |
| Height | Carton Height | e.g. 30 | — |

Unit toggle default: **cm**. Toggle pill shows "cm" and "in".
Helper text for the group (below the three fields, italic, muted): "Outer dimensions of your shipping carton including packaging."

**Group B — Quantity**

| Field | Label | Placeholder | Helper Text |
|---|---|---|---|
| Carton Quantity | Number of Cartons | e.g. 200 | Total cartons in this shipment |

**Group C — Weight**

| Field | Label | Placeholder | Helper Text |
|---|---|---|---|
| Weight | Gross Weight per Carton | e.g. 15 | Include product, packaging, and pallet if applicable |

Unit toggle: **kg** / **lb**.

**Group D — Container Type**

Label: **Container Type**
Helper text: "40GP is the most common. 40HQ adds height for tall cartons."
Segmented control options: `20GP` | `40GP` | `40HQ`
Default: `40GP` pre-selected.
Below the selector, show a one-line spec echo for the selected container type (updated on change):
- 20GP: "33.0 CBM · 28,200 kg payload · 5.9 × 2.4 × 2.4 m interior"
- 40GP: "67.0 CBM · 26,700 kg payload · 12.0 × 2.4 × 2.4 m interior"
- 40HQ: "76.0 CBM · 26,500 kg payload · 12.0 × 2.4 × 2.7 m interior"

**Group E — Stackable**

Label: **Can Cartons Be Stacked?**
Helper text: "Select No for fragile, top-heavy, or liquid cartons."
Toggle: **Yes** (default) / **No**
When No is selected, show a soft inline note: "Non-stackable cartons use floor space only. Utilization will be lower."

**Group F — Optional Fields**

Section label: "Optional: Shipment Details"
Disclosure control copy: "Add shipment name, category, or value (optional)" — clicking expands; on desktop this section is always visible.

| Field | Label | Placeholder | Helper Text |
|---|---|---|---|
| Shipment Name | Shipment Name | e.g. Summer 2026 PO | For your reference only. Not saved. |
| Product Category | Product Category | e.g. Apparel | Optional. Helps context. |
| Shipment Value | Declared Value (USD) | e.g. 45000 | Optional. Used for reference only. |

### 3c. Unit Toggle UX

**Behavior:**
- Each unit toggle is a pair of pill buttons (e.g., `cm` `in`), styled as a segmented toggle, placed immediately to the right of its input field on the same row.
- The active unit is filled/selected; the inactive unit is outlined/muted.
- Pill buttons are touch-friendly: minimum 36px height, minimum 48px combined width.

**Dimension fields (Length, Width, Height):**
- Unit is **synced across all three dimension fields**. Changing the unit on any one dimension field updates all three simultaneously.
- When the user switches units, the numeric values in all three fields are converted and updated in real time (cm → in: divide by 2.54; in → cm: multiply by 2.54), rounded to 1 decimal place.
- Converted values replace the field content. The field enters valid state after conversion.

**Weight field:**
- Unit toggle is independent of dimension toggles.
- When the user switches kg → lb: multiply by 2.20462, round to 1 decimal place.
- When the user switches lb → kg: divide by 2.20462, round to 2 decimal places.
- Converted value replaces the field content.

**Persistence:**
- Selected units persist for the duration of the session (local component state). There is no cross-session persistence in v0.2.
- On result rendering, the canonical unit echo (meters, kg) is always shown regardless of the input unit the user chose.

### 3d. Validation Behavior

**Trigger:** Errors appear on submit attempt (not on blur for required fields in v0.2). After the first submit attempt, validation runs on-change as the user corrects fields.

**Field-level error copy:**

| Field | Condition | Error Message |
|---|---|---|
| Carton Length | Empty | "Carton length is required." |
| Carton Length | Zero or negative | "Length must be greater than 0." |
| Carton Length | Non-numeric | "Enter a number." |
| Carton Length | Unreasonably large (>999 cm or >393 in) | "Check this value — it seems larger than a standard carton." |
| Carton Width | Empty | "Carton width is required." |
| Carton Width | Zero or negative | "Width must be greater than 0." |
| Carton Width | Non-numeric | "Enter a number." |
| Carton Height | Empty | "Carton height is required." |
| Carton Height | Zero or negative | "Height must be greater than 0." |
| Carton Height | Non-numeric | "Enter a number." |
| Carton Quantity | Empty | "Carton quantity is required." |
| Carton Quantity | Zero or negative | "Quantity must be at least 1." |
| Carton Quantity | Non-integer | "Enter a whole number." |
| Carton Quantity | Exceeds 99,999 | "Check this value — maximum supported quantity is 99,999." |
| Gross Weight per Carton | Empty | "Gross weight is required." |
| Gross Weight per Carton | Zero or negative | "Weight must be greater than 0." |
| Gross Weight per Carton | Non-numeric | "Enter a number." |
| Gross Weight per Carton | Unreasonably large (>2000 kg or >4409 lb) | "Check this value — weight per carton seems very high." |

**Visual treatment:**
- Red border on the invalid field.
- Red helper text below the field (14px, color: `#D93025` or equivalent semantic error color).
- Error icon (small ⚠ or ✗) at the right end of the field.
- Valid fields: no icon, no special border color (neutral). Do NOT show green checkmarks on every valid field — only show them after a failed submit to avoid visual noise during initial fill.

**Recovery:**
- As soon as a field value passes validation (on-change after first submit attempt), the red border and error text clear immediately. No confirmation state needed.

### 3e. Form Submit Button

**Button label (idle):** `Check Container Fit`
**Button label (loading):** `Calculating...` with a spinner icon to the left of text
**Button style:** Primary filled, full-width on mobile, auto-width (min 220px) on desktop
**Disabled state:** Button is disabled while the form has been submitted and is in loading state. Button is NOT pre-emptively disabled before any submission attempt (allow user to try submitting to trigger validation feedback).
**Loading duration:** Client-side calculation should complete in under 500ms. If it exceeds 500ms, show spinner. Otherwise the state transition is instant.

---

## 4. Result Page Structure

The result card appears below the form on mobile, or in the right panel on desktop. The five blocks below appear in this fixed vertical order.

### 4a. Disclaimer Strip (Always Visible)

**Position:** Top of result card, above all result blocks.
**Visual:** Light amber/yellow background strip (`#FFFBE6` or Ant Design `warning` light token), with a small info icon on the left.
**Copy (exact):**
> "Planning estimate only. Confirm with your forwarder before booking. Actual container capacity depends on carton geometry, loading method, pallets, and destination weight limits."

**Behavior:** This strip is ALWAYS visible when the result card is shown. It cannot be dismissed or hidden. It survives re-calculation.

### 4b. Verdict Block (Priority 1)

**Position:** Directly below disclaimer strip.
**Purpose:** Immediately answer "Can it fit?" with a binary, color-coded, unambiguous answer.

**States:**

| Condition | Badge Color | Headline | Sub-line |
|---|---|---|---|
| Fits (all rules pass or only advisory rules fire) | Green (`#52C41A`) | Fits in a [Container Type] | e.g., "Your 200 cartons fit in a 40GP with room to spare." |
| Fits with warnings (R5, R6, R10, R14 fire) | Orange (`#FA8C16`) | Fits — with caution | e.g., "Volume is tight. Review utilization details." |
| Does not fit — volume (R7) | Red (`#FF4D4F`) | Does Not Fit | "Total volume exceeds 40HQ capacity." |
| Does not fit — dimension (R13) | Red (`#FF4D4F`) | Carton Too Large | "A carton dimension exceeds the container interior." |
| Over payload (R11) | Red (`#FF4D4F`) with orange flag | Fits (volume) — Over Payload | "Total weight exceeds payload limit." |

**Layout:** Large badge (pill or chip) with icon + label. Below badge, a single-sentence human summary. No more than 2 lines.

### 4c. Container Recommendation Block (Priority 2)

**Position:** Below verdict block.
**Purpose:** Name the smallest container that fits at or below 85% volume utilization.

**Content:**
- Heading: "Recommended Container"
- Large text: e.g., **40GP**
- Sub-line: "Best fit at [X]% volume utilization"
- If no container fits: "No standard container fits this shipment. Consider splitting."
- If the user-selected container differs from the recommendation, add a note: "You selected a 20GP — we recommend upgrading to a 40GP for this shipment."
- If R8 fires (20GP overflows, 40GP fits): show "Switch from 20GP to 40GP" as the recommendation headline.
- If R9 fires (40GP vol >90%, compare 40HQ): show "Consider 40HQ" as an alternative note below primary recommendation.

### 4d. Utilization Score Block (Priority 3)

**Position:** Below recommendation block.
**Purpose:** Show volume utilization % and payload utilization % as visual bars.

**Volume Utilization Bar:**
- Label: "Volume Utilization"
- Value: "XX.X% of [Container] CBM capacity"
- Sub-label: "[X.XX CBM used] / [YY.Y CBM total]"
- Progress bar: colored by band (see below)
- Band label appears to the right of or below the bar

**Payload Utilization Bar:**
- Label: "Payload Utilization"
- Value: "XX.X% of [Container] payload"
- Sub-label: "[XXX kg total weight] / [XX,XXX kg limit]"
- Progress bar: colored by band

**Band definitions:**

| Band | Volume % Range | Bar Color | Band Label |
|---|---|---|---|
| Under-utilized | < 50% | Blue-gray (`#8C9BAB`) | "Under-utilized" |
| Healthy | 50–85% | Green (`#52C41A`) | "Healthy" |
| Tight | 85–95% | Orange (`#FA8C16`) | "Tight" |
| Over limit | 95–100% | Red (`#FF4D4F`) | "At limit — real loading may fail" |
| Exceeds | > 100% | Red, filled solid + overflow indicator | "Exceeds capacity" |

The same band logic applies to both volume and payload bars. Payload uses its own percentage independent of volume.

**R12 note:** When Stackable = No, add an inline note below the volume bar: "Non-stackable: utilization calculated on floor area only. Effective capacity is lower."

### 4e. Action Recommendation Block (Priority 4)

**Position:** Below utilization block.
**Purpose:** Translate the rules (R1–R14) into a plain-language "here is what to do" message.

**Layout:** One primary action message (highest-priority rule that fired), followed optionally by one secondary note (next-highest rule). No more than 2 messages to avoid noise.

**Rule copy — exact UI message for each rule:**

| Rule | Trigger | UI Message |
|---|---|---|
| R1 | CBM < 13 AND weight < 3,500 kg | "Your shipment is small enough to consider LCL (Less than Container Load). Compare LCL rates with your forwarder — you may save money by sharing a container." |
| R2 | Vol <50% AND payload <50% | "Your shipment is using less than half of the container's space and weight capacity. Consider consolidating with another shipment or switching to a smaller container to reduce cost." |
| R3 | Vol 50–60% | "Container is under-utilized. If cost per CBM matters, ask your forwarder about LCL or combining with another PO." |
| R4 | Vol 60–85% | "Good utilization. This container is efficiently loaded." |
| R5 | Vol 85–95% | "Space is tight. Confirm your carton count with your factory before booking. Actual loading may vary by +/- a few CBM." |
| R6 | Vol 95–100% | "This is at the edge of container capacity. Real-world loading rarely achieves 100% due to carton geometry. We recommend bumping to the next container size." |
| R7 | Vol >100% | "Volume exceeds container capacity. Your cartons do not fit. Split into multiple containers or reduce order quantity." |
| R8 | 20GP overflows, 40GP fits | "Your shipment does not fit in a 20GP but fits in a 40GP. Switch to a 40GP." |
| R9 | 40GP vol >90% | "40GP is very full. Compare against a 40HQ — it adds ~9 CBM at similar cost and may give you more breathing room." |
| R10 | Payload >90% of limit | "You are close to the payload limit. Confirm total gross weight with your factory and declare the weight to your forwarder before booking." |
| R11 | Payload >100% | "Total weight exceeds the container's payload limit. You must split the shipment or reduce carton weight. Confirm with your forwarder immediately." |
| R12 | Stackable = No | "Non-stackable cartons cannot be stacked, which significantly reduces usable volume. Actual utilization will be lower than the volume calculation shows." |
| R13 | Any carton dim > container internal dim | "One or more carton dimensions exceed the container's interior. This carton physically cannot be loaded. Repack or contact your factory." |
| R14 | 20GP payload >75% | "20GP containers on some road legs have lower weight limits than the container payload rating. If your cargo moves by road, confirm the road weight limit with your forwarder." |

**Priority enforcement in the UI:**
Display rules in this priority order (highest first): R13 > R7/R11 > R6/R10/R14 > R8/R9 > R1/R2/R12 > R3/R5 > R4.
Show the top 1 rule as the primary action block.
If a second rule at a different priority level also fires, show it as a secondary note (visually smaller, muted background).
Do NOT show R4 ("Good utilization") if any other rule fires — R4 is shown only when no other rule fires.

### 4f. Supporting Detail Block (Priority 5)

**Position:** Below action recommendation block.
**Default state:** Collapsed on mobile (show "Show calculation details" link). Expanded by default on desktop.
**Purpose:** Provide the numbers behind the result for users who want to verify or share.

**Content (organized into two sub-sections):**

**Carton & Shipment Summary**
- Carton dimensions (canonical, in meters): e.g., "0.60 m × 0.40 m × 0.30 m"
- Carton volume (CBM per carton): "0.072 CBM per carton"
- Carton quantity: "200 cartons"
- Total shipment volume: "14.4 CBM"
- Gross weight per carton (canonical, in kg): "12.00 kg per carton"
- Total gross weight: "2,400 kg"

**Container Specification**
- Selected container type: "40GP"
- Interior dimensions: "12.032 m × 2.352 m × 2.395 m"
- Usable volume: "67.0 CBM"
- Payload limit: "26,700 kg"
- Volume used: "14.4 CBM (21.5%)"
- Volume remaining: "52.6 CBM (78.5%)"
- Weight used: "2,400 kg (9.0%)"
- Weight remaining: "24,300 kg (91.0%)"

**Canonical unit note (always visible in this block):**
"All values shown in metric units (m, CBM, kg). Input values converted from [user's input unit] for calculation."

### 4g. Disabled CTA Section

**Position:** Bottom of the result card, below the supporting detail block.
**Always rendered when result is visible.**
**Layout:** Two side-by-side buttons on desktop; stacked on mobile.

Button 1: "Generate Supplier Email Draft"
Button 2: "Download Utilization Report"

See Section 8 for complete disabled CTA treatment.

---

## 5. All UI States

### 5a. Empty State (Page Loaded, No Results)

**Form area:** All fields at default values (no pre-fill). Container Type = 40GP selected. Stackable = Yes selected. Optional fields hidden on mobile (collapsed).
**Result area (desktop two-column):** Right panel shows an instructional placeholder:
- Icon: simple container outline or calculation icon (not decorative art)
- Heading: "Your result will appear here"
- Sub-text: "Fill in your carton details and click Check Container Fit."
- No CTAs in the right panel during empty state.

**Mobile:** Right panel / result card is not rendered. The page is only the form.

### 5b. Field-Focused State

- Blue border ring around the focused field (`#1677FF` or Ant Design primary color token).
- Helper text (if defined) appears below the field when focused.
- No other visible change. Unit toggle remains visible and functional.

### 5c. Field Valid State

- After a failed submit attempt, valid fields show a neutral border (no special color).
- No green checkmark during initial fill (reduces noise).
- After a failed submit attempt has been corrected: error clears, field returns to neutral state.

### 5d. Field Invalid State — Error Copy

See Section 3d for complete per-field error copy. Visual treatment:
- Red border (`#FF4D4F`).
- Red error text below the field, 14px, left-aligned.
- Small warning icon to the right inside the input or below the label.
- Helper text is replaced by the error text (not stacked).

### 5e. Form Loading State (After Submit)

- Submit button label changes to "Calculating..." with a spinner (left of text).
- Button is disabled (no further clicks accepted).
- All form fields remain editable (user can start editing for next calculation).
- On mobile, if the result card is below the fold, it does not yet appear. The button area is the only loading indicator.
- Duration: Should resolve in under 500ms for all realistic inputs. No skeleton screen needed — the transition is fast enough.

### 5f. Success State (Result Rendered)

- Result card fades in (150ms opacity transition) below the form on mobile, or in the right panel on desktop.
- Disclaimer strip always visible at top of card.
- All five blocks rendered in order (4a through 4g).
- On mobile: page auto-scrolls to bring the top of the result card into view (smooth scroll).
- On desktop: no scroll — the right panel updates in place.
- Submit button returns to "Check Container Fit" idle state. On mobile, a "Recalculate" secondary link appears above or below the result card (scrolls back to form).

### 5g. Hard Fit-Fail State (R13)

- Verdict badge: Red, "Carton Too Large — Does Not Fit"
- Subtitle: States which dimension failed and by how much (e.g., "Carton height 2.80 m exceeds 40HQ interior height 2.698 m by 0.10 m").
- Container Recommendation block: "No standard container fits this carton. Repack or contact your factory."
- Utilization block: Replaced by a single-line note: "Utilization cannot be calculated — carton dimension exceeds container interior."
- Action Recommendation: R13 copy (see 4e). No secondary rule shown.
- Supporting detail: Available and expanded, showing the dimension comparison.
- Disabled CTAs: Still shown.

### 5h. Borderline States (R5/R6)

**R5 (Vol 85–95% — Tight):**
- Verdict badge: Orange, "Fits — Space Is Tight"
- Utilization bar: Orange, band label "Tight"
- Action recommendation: R5 copy shown as primary.

**R6 (Vol 95–100% — At Limit):**
- Verdict badge: Orange-red, "Fits — At Capacity Limit"
- Utilization bar: Red, band label "At limit — real loading may fail"
- Action recommendation: R6 copy shown as primary, with a visual note: "Consider next container size."

### 5i. Over-Payload State (R10/R11/R14)

**R10 (Payload 90–100%):**
- Verdict block shows the volume-fit verdict normally (green or orange).
- An orange secondary banner appears immediately below the verdict: "Weight Warning: You are close to the payload limit."
- Payload utilization bar: Orange.
- Action recommendation: R10 copy as primary (or alongside volume rule at lower priority).

**R11 (Payload >100%):**
- Verdict block: Red badge "Over Payload — Weight Exceeds Limit" as a secondary verdict line below the main volume verdict.
- Payload utilization bar: Red, filled past 100% with overflow indicator.
- Action recommendation: R11 copy as primary.

**R14 (20GP payload >75%):**
- Verdict block: Normal.
- Action recommendation: R14 copy appears as secondary note below primary action.

### 5j. LCL Hint State (R1)

- Verdict block: Green "Fits" (the shipment fits in a 20GP or 40GP).
- Below the verdict, an informational blue chip/badge: "LCL May Be Cost-Effective"
- Action recommendation: R1 copy as primary.
- Utilization bars: Show normally (volume and payload both low).

---

## 6. Mobile vs Desktop Behavior

### 6a. Breakpoints

| Breakpoint | Width | Layout Change |
|---|---|---|
| Mobile S | 375px (primary design target) | Single column. Form full width. Result card below form. Optional fields collapsed. Supporting detail collapsed. |
| Mobile L / Tablet | 768px | Single column still. More breathing room. Optional fields may auto-expand. Supporting detail may expand. |
| Desktop | 1024px | Two-column layout activates. Form on left (~420px), result panel on right (fills remaining space). |
| Wide Desktop | 1440px | Max content width ~1200px, centered with padding. Two-column layout. No layout change from 1024px, just more margin. |

### 6b. Above the Fold at 375px

**On initial page load (no result):**
The following must be visible without scrolling at 375px × 667px (iPhone SE viewport):
- Page heading: "Container Utilization Checker"
- One-line tool description
- At minimum: Group A header ("Carton Dimensions") and the first input row (Length field + unit toggle)
- The "Check Container Fit" button must be reachable by scrolling (not hidden behind any sticky element)

**After result renders:**
The page auto-scrolls to the result card. At 375px, the following must be visible without additional scroll:
- Disclaimer strip (full text)
- Verdict block (badge + headline + one-line summary)
- Top portion of the container recommendation block

The utilization bars and action recommendation require one scroll gesture. This is acceptable.

### 6c. Layout Transitions

**Mobile to Desktop (1024px+):**
- Form moves to the left column. Width: ~420px or 40% of content area (whichever is larger).
- Result panel appears in the right column. Same height as the form column (vertically aligned at top).
- When form is taller than result (empty state), right panel stretches to match.
- When result is taller than form, right panel allows natural scroll within the page.

**Optional fields:**
- Mobile: hidden by default behind a disclosure control ("Add shipment details (optional)"). One tap expands.
- Desktop 1024px+: Always visible below Group E, no disclosure control needed.

**Supporting detail:**
- Mobile: Collapsed. User taps "Show calculation details" to expand inline.
- Desktop: Always expanded. No toggle.

**Container spec echo (below the container selector):**
- Mobile: One line, small text (12px).
- Desktop: Same. Always visible.

### 6d. Touch Target Requirements

All interactive elements must meet a minimum 44×44px touch target on mobile.

| Element | Minimum Touch Target | Notes |
|---|---|---|
| Unit toggle pill (cm/in, kg/lb) | 44×44px combined per toggle pair | Each pill individually: minimum 36×44px; pair together: minimum 88×44px |
| Container type segmented control | 44px height, minimum 64px width per segment | Three segments: 20GP, 40GP, 40HQ |
| Stackable Yes/No toggle | 44×44px per option | |
| Check Container Fit button | Full width on mobile, minimum 44px height | |
| "Show calculation details" expand link | 44px tap height | Include adequate top/bottom padding |
| Optional fields disclosure link | 44px tap height | |
| Disabled CTA buttons | Full width on mobile, minimum 44px height | Even though disabled, must not have too-small hit area that might confuse users |

---

## 7. Visual Tone and Brand Notes

### 7.1 Overall Tone

This is a **B2B business tool**, not a consumer app. The visual language should communicate:
- **Precision and reliability** — users trust this with real shipping decisions
- **Professional clarity** — numbers and results should be scannable in seconds
- **Institutional credibility** — the design should not look like a free online converter

Avoid:
- Illustration or decorative art in the tool (use icons only where functional)
- Bright consumer-app accent colors
- Playful or casual typography
- Dashboard-style chrome around a simple form

### 7.2 Typography

- **Body / form labels:** Inter, 14–16px, regular weight
- **Form section headings (Group labels):** Inter, 14px, semi-bold (600), muted gray
- **Result block headings:** Inter, 16–18px, semi-bold (600)
- **Verdict headline:** Inter, 22–24px, bold (700)
- **Numbers / utilization %:** Inter, 28–32px, bold (700) for the primary % value; 14px for unit labels
- **Disclaimer text:** Inter, 12–13px, regular, muted (amber background handles the emphasis)
- **Error text:** Inter, 13px, regular, red

### 7.3 Color System

| Token | Use | Hex (approximate) |
|---|---|---|
| `primary-blue` | Links, active toggle, submit button | `#1677FF` (Ant Design default) |
| `success-green` | "Fits" badge, healthy utilization bar | `#52C41A` |
| `warning-orange` | Tight/caution states, warning badges | `#FA8C16` |
| `error-red` | Hard fail, over-limit, field errors | `#FF4D4F` |
| `info-blue` | LCL hint, informational notes | `#1677FF` at 10–15% opacity background |
| `neutral-gray` | Body text, labels, borders | `#595959` / `#D9D9D9` |
| `background` | Page background | `#F5F7FA` (light gray, not pure white) |
| `card-background` | Form and result card | `#FFFFFF` |
| `disclaimer-bg` | Disclaimer strip | `#FFFBE6` |
| `disabled-bg` | Disabled CTA buttons | `#F5F5F5` |
| `disabled-text` | Disabled CTA labels | `#BFBFBF` |

### 7.4 Component Vocabulary (Ant Design)

- **Form:** `<Form>` with `layout="vertical"` on mobile, `layout="vertical"` on desktop (labels always above fields)
- **Inputs:** `<InputNumber>` for numeric fields (enforces numeric keyboard on mobile)
- **Unit toggles:** `<Segmented>` component (Ant Design 5.x) or `<Radio.Group buttonStyle="solid">`
- **Container type selector:** `<Segmented>` with three options
- **Stackable toggle:** `<Segmented>` with Yes/No
- **Submit button:** `<Button type="primary" size="large">`
- **Result card:** `<Card>` with no extra border, slight shadow
- **Disclaimer strip:** `<Alert type="warning" showIcon banner>` with `closable={false}`
- **Verdict badge:** `<Tag>` or custom pill with semantic color
- **Utilization bars:** `<Progress type="line">` with `strokeColor` based on band
- **Action recommendation:** `<Alert type="info|warning|error">` depending on severity
- **Disabled CTAs:** `<Button disabled>` with `<Tooltip title="Coming in v1.1">` wrapper
- **Field errors:** Ant Design Form validation messages (native `validateStatus` and `help` props)
- **Supporting detail:** `<Collapse>` panel on mobile; plain rendered section on desktop

### 7.5 Dock to AI Brand Alignment

- Use the same Inter typeface used across Dock to AI properties.
- Primary blue (`#1677FF`) aligns with Ant Design defaults and should be consistent with site nav/header colors.
- No custom illustrations — keep iconography to functional Ant Design icons only (e.g., `<CheckCircleOutlined>`, `<WarningOutlined>`, `<CloseCircleOutlined>`).
- The tool should feel like it belongs to the same site as the other Dock to AI tool pages.

---

## 8. Disabled Placeholder Treatment

### 8a. Visual Style

Both disabled CTAs use the following visual treatment:

- **Background:** `#F5F5F5` (Ant Design disabled background)
- **Text color:** `#BFBFBF` (muted, clearly non-interactive)
- **Border:** `1px solid #D9D9D9`
- **Cursor:** `not-allowed` (CSS `cursor: not-allowed`)
- **Opacity:** 1.0 (full opacity — the button is fully visible, just non-interactive). Do NOT use `opacity: 0.4` because that can look like a rendering error. Full opacity with muted colors communicates "this exists but is not yet available."
- **No hover state change:** No background color change, no shadow on hover. The cursor change to `not-allowed` provides the only hover feedback.
- **No active/pressed state.**
- **No focus ring** (since it cannot receive keyboard interaction as a functional button — see 8c).

A small badge or chip sits adjacent to each button (above, to the right, or overlaid in the top-right corner):
- Badge style: Light gray pill, small text, e.g., `Coming in v1.1`
- Badge color: `#8C8C8C` text on `#F0F0F0` background
- Badge font size: 11px

### 8b. Label and Badge Copy

| Button | Button Label | Tooltip Text | Badge Text |
|---|---|---|---|
| Generate Supplier Email Draft | Generate Supplier Email Draft | "This feature is coming in v1.1. Check back soon." | "Coming in v1.1" |
| Download Utilization Report | Download Utilization Report | "PDF report export is coming in v1.1." | "Coming in v1.1" |

Tooltip trigger: hover (desktop) and long-press (mobile, if supported by the Tooltip component). Tooltip appears above the button.

Section heading above both disabled CTAs:
**"More Actions"** — semi-bold, 14px, muted gray, followed by a sub-line in smaller text: "Additional features arriving in v1.1."

### 8c. Why It Is Not a Broken Button

The design communicates "intentionally unavailable" rather than "broken" through three mechanisms:

1. **The badge is always visible** — "Coming in v1.1" is visible without any user interaction. The user does not need to click or hover to learn the button is not ready.
2. **The tooltip confirms intentionality** — On hover/long-press, the tooltip provides a positive, forward-looking message ("coming in v1.1") rather than an error message.
3. **The section heading contextualizes** — "More Actions — Additional features arriving in v1.1" frames both buttons as a planned future section, not a failed current one.

Avoid: graying out buttons without a badge, which looks like a bug. Avoid: showing these buttons only sometimes (they should always appear in the result state for consistency and feature discovery).

### 8d. Accessibility

- The disabled button element uses `aria-disabled="true"` rather than the native `disabled` attribute.
  - Reason: `disabled` removes the element from the tab order entirely, making it invisible to screen reader users. `aria-disabled="true"` keeps it reachable but non-actionable, allowing screen reader users to discover the upcoming feature.
- The element remains focusable via keyboard (Tab key) but pressing Enter/Space does nothing.
- Screen reader announcement: When focused, the screen reader should announce:
  - **"Generate Supplier Email Draft, button, unavailable, Coming in v1.1"**
  - **"Download Utilization Report, button, unavailable, Coming in v1.1"**
- To achieve this, include `aria-describedby` pointing to a visually-hidden span containing "Coming in v1.1. This feature is not yet available."
- Do not use `title` attribute as the sole accessibility mechanism — it is not reliably announced.

---

## 9. UI Acceptance Criteria

The following criteria are specific and measurable. Developer should verify each before marking the feature ready for review.

**AC-01 — Verdict visible without scroll on mobile after submit**
On a 375 × 667px viewport (iPhone SE), after submitting a valid form, the result card is visible and the Verdict Block (badge + headline) is fully above the fold without any scroll interaction.

**AC-02 — Disclaimer strip non-dismissible**
The disclaimer strip ("Planning estimate only...") appears at the top of the result card and cannot be dismissed. There is no close button, dismiss icon, or way to hide it. It persists across recalculations.

**AC-03 — Unit toggle syncs across dimension fields**
Changing the unit toggle on any one of the three dimension fields (Length, Width, Height) causes all three toggles to update to the same unit. The numeric values in all three fields are converted and updated in the same user interaction.

**AC-04 — Numeric values convert on unit switch**
When the user switches the dimension unit toggle from cm to in, the values in all three dimension fields are multiplied by (1/2.54) and rounded to 1 decimal place. When switching from in to cm, values are multiplied by 2.54 and rounded to 1 decimal place. The weight field converts independently using kg ↔ lb ratio of 2.20462.

**AC-05 — Submit triggers inline validation, not browser native validation**
Clicking "Check Container Fit" with empty required fields does NOT trigger browser-native validation popups. Validation is handled entirely in the UI with inline error messages per field. All invalid fields show errors simultaneously (not sequentially).

**AC-06 — R13 hard fail suppresses utilization bars**
When R13 fires (a carton dimension exceeds the container interior), the Utilization Score Block (volume bar and payload bar) is NOT rendered. Instead, a note reading "Utilization cannot be calculated — carton dimension exceeds container interior." appears in its place.

**AC-07 — R13 fires before R7 and all other rules**
If both R13 (dimension overflow) and R7 (volume overflow) conditions are true simultaneously, only R13 is surfaced in the verdict and action recommendation. R7 is not shown.

**AC-08 — Disabled buttons remain visible but non-interactive**
Both disabled CTA buttons ("Generate Supplier Email Draft" and "Download Utilization Report") are visible in the result card at all times when the result is rendered. Clicking or tapping them produces no action, no navigation, and no console error. The cursor shows `not-allowed` on hover.

**AC-09 — "Coming in v1.1" badge always visible without hover**
The "Coming in v1.1" badge is visible on each disabled CTA button without any hover, tap, or interaction. It does not require tooltip activation to be seen.

**AC-10 — Result canonical units always in metric**
The Supporting Detail Block always shows dimension values in meters (m), volume in CBM, and weight in kg, regardless of the unit toggles the user selected in the form. A note identifies the original input unit.

**AC-11 — Container spec echo updates on selection change**
When the user changes the Container Type selector (20GP / 40GP / 40HQ), the one-line spec summary below the selector updates immediately to reflect the selected container's specs (CBM, payload, interior dimensions).

**AC-12 — Two-column layout at 1024px+**
At viewport width 1024px and above, the form and result panel are side-by-side in a two-column layout. The form is on the left, the result panel is on the right. At 768px and below, they are stacked vertically (form above, result below).

**AC-13 — Supporting detail collapsed on mobile by default**
On a 375px viewport, the Supporting Detail Block is collapsed on initial result render. A "Show calculation details" link is visible. Tapping it expands the block inline without a page reload or navigation.

**AC-14 — Stackable = No shows tighter utilization note**
When the user selects Stackable = No and submits, the result card shows an inline note below the volume utilization bar: "Non-stackable: utilization calculated on floor area only. Effective capacity is lower." This note does NOT appear when Stackable = Yes.

**AC-15 — All 14 rules produce distinct UI messages**
Each of R1 through R14, when triggered in isolation, produces the exact message copy specified in Section 4e. No two rules share the same UI message text. Each message is tested individually with synthetic input values designed to trigger each rule precisely.

**AC-16 — Over-payload verdict distinct from volume-fail verdict**
When R11 fires (total weight >100% of payload), the verdict does NOT show a generic "Does Not Fit" badge. The badge reads "Fits (volume) — Over Payload" with a red indicator. The distinction between volume overflow (R7) and payload overflow (R11) is visually distinguishable.

**AC-17 — Form fields accept decimal input**
The Length, Width, Height, and Gross Weight fields accept decimal numeric input (e.g., 60.5, 14.3). Integer-only validation is applied only to the Carton Quantity field.

**AC-18 — Minimum touch targets met**
All interactive elements on mobile (375px) meet a minimum touch target of 44×44px as specified in Section 6d. This is verified by measuring the rendered bounding box of each element in Chrome DevTools with the device set to 375×667px.

**AC-19 — aria-disabled on CTA buttons, not native disabled**
Inspecting the DOM of the disabled CTA buttons shows `aria-disabled="true"` on the button element, not the native `disabled` attribute. The buttons are reachable via Tab key navigation. When focused, a screen reader announces the button label followed by "unavailable" or equivalent.

**AC-20 — No result shown on page load**
On initial page load, no result card, no utilization bars, no verdict block, and no disclaimer strip are visible. The right panel on desktop shows the instructional empty state. On mobile, only the form is visible.

---

*End of UX Specification — Container Utilization Checker / CBM Calculator v0.2*
*Document owner: UX Product Designer, Dock to AI Product Build Squad*
*Next: Developer to build against this spec. Esther approves before public launch.*
