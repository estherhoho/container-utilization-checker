# PRODUCT-SPEC v0.3 PATCH — Container Utilization Checker

**Status:** Diff on top of `PRODUCT-SPEC-v0.2.md`. Adds Esther-confirmed UX scope (3 items, 2026-06-03). No changes to scope boundaries, formulas, container constants, or rule table.
**Parent:** [DOC-34](mention://issue/9ed6105f-fe09-482d-9387-510cd3aba4d2)
**Owner:** PM
**Approved by:** Esther 2026-06-03 ("A is good and ok continue" on [DOC-34](mention://issue/9ed6105f-fe09-482d-9387-510cd3aba4d2)).

---

## What's changing from v0.2

Three UX additions to surface during Stage 3.5 (UX v2). All sit inside `§9 UX Requirements` and inform the Stage 3 deliverables (UX-SPEC, UI-PLAYGROUND, mockups).

### Add §9.A — Visual differentiation of 3 Playground options (Esther Ask 1 = A)

The 3 options in `UI-PLAYGROUND.md` must be **visually distinct enough** that a non-designer can pick by feel. v1 had layouts that genuinely differ but lacked surface differentiation (mobile A vs B both single-column form, similar color, similar density).

UX v2 must vary at minimum 3 of the following across the 3 options:
- Primary color / accent palette (not just blue with shifting tints)
- Result card density (sparse vs medium vs dense; cards vs table vs hero verdict)
- Form grouping treatment (no labels-as-headers vs section dividers vs full step screens)
- Typography weight emphasis (display verdict vs equal-weight metrics)
- Iconography presence (icon-light vs icon-heavy)

Each option keeps its underlying layout strategy from v1 (single column / split / stepper). Differentiation is on top of layout, not replacing it.

### Add §9.B — Usage instructions / onboarding

First-time SMB users need to understand "what is this, how do I fill it, what will I see." UX v2 must add:

1. **Top guide card on first visit** (collapsible, remembers dismissed state in localStorage)
   - 3-step explainer: "Fill carton dimensions → Pick container → See if it fits + what to do next"
   - One-line value: "Plan your container in under 90 seconds before you book."
2. **Per-field helper text** on the critical-misunderstanding fields:
   - Length / Width / Height: "Outer dimensions of the carton in cm or inch."
   - Quantity: "Total number of cartons in this shipment."
   - Gross weight per carton: "**Gross weight, including packaging.** Not net."
   - Container type: "Standard ocean containers. Pick what your forwarder quoted."
   - Stackable: "Can cartons stack safely on top of each other?"
3. **"Try an example" button** above the form
   - Click → prefills typical SMB FBA scenario: 500 ct, 60×40×30 cm, 12 kg, 40GP, stackable=yes.
   - User can edit and resubmit. Empty state never blocks understanding.

### Add §9.C — Real-time inline feedback (Esther Ask 3 = yes)

Show running computation + helper hints as the user fills the form. All client-side, no extra API. Max 5 active hints at once to avoid noise.

| Trigger | Display | Style |
|---------|---------|-------|
| Length + Width + Height all valid | "Carton CBM: X.XXX m³" | Subtle helper line under the dimension group |
| Quantity also valid | "Total shipment CBM: XX.XX m³" | Same style, updates live |
| Quantity + weight both valid | "Total shipment weight: X,XXX kg" | Same style |
| All 4 carton dims (L/W/H + weight) valid | Carton-size sanity tag (one of): "✓ Standard FBA carton" / "Large carton" / "Compact carton" | Pill near dimension group |
| Same trigger | Density sanity tag (one of): "Light cargo (low density)" / "Medium density" / "Dense / heavy cargo — payload may bind" | Pill near weight field |
| Carton dimension > container internal dim (any axis) | "⚠️ Carton too large for selected container" | Inline warning, blocks submit |

**Thresholds for hint copy** (PM-defined, refine in UX-SPEC v2):
- Standard FBA carton: longest side 40–70 cm AND volume 0.04–0.10 m³
- Large carton: longest side > 100 cm OR volume > 0.4 m³
- Compact carton: longest side < 30 cm AND volume < 0.02 m³
- Light cargo: density (kg/m³) < 100
- Medium: 100–500
- Dense / heavy: > 500

## Out of scope for v0.3 patch (still deferred to v1.1+)

- Real LLM-generated instructions or feedback (rules-based only in v0.2/0.3)
- Multi-language onboarding (English only in v0.2/0.3)
- Animated tooltips, video walkthroughs, interactive tutorials
- A/B testing infrastructure for instruction copy
- Persisting "try an example" presets across sessions

## Definition of Done — v0.3 additions

- UX v2 delivers updated `UX-SPEC.md` §9.A / §9.B / §9.C content
- UX v2 delivers updated 3-option mockups (desktop + mobile each), 6 PNGs total, with the visual differentiation above clearly visible
- UX v2 delivers updated `UI-PLAYGROUND.md` describing each option's distinctive look-and-feel
- All AC fixtures from v0.2 §12 still pass (no math change)
- New AC fixture: when user keys in dims for fixture AC-A1 (500 ct 60×40×30 cm 12 kg), live helper shows "Total CBM: 36.00 m³" and "Standard FBA carton" tag

## Open questions

None. All 3 asks confirmed by Esther 2026-06-03.
