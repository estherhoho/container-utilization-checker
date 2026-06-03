# PRODUCT-SPEC v0.2 — Container Utilization Checker / CBM Calculator

**Status:** Engineering-ready PRD, awaiting Esther light review.
**Owner:** PM (Multica Product Build Squad lead).
**SME validated:** 2026-06-02 — Supply Chain SME pass complete ([DOC-35](mention://issue/cfdfd3b5-cdbc-437d-b060-c4a883082303)).
**Diff from v0.1 attachment:** acceptance criteria added with concrete test fixtures; recommendation rules table promoted from SME §7; edge cases formalized; container constants annotated with road-weight caveat; disclaimer wording finalized per SME §6. No scope changes.

---

## 1. Product Name

Container Utilization Checker / CBM Calculator (装柜利用率检查器 / CBM 计算器).

## 2. Target User

| Persona | Primary need |
|---------|--------------|
| SMB ecommerce importer (FBA seller, DTC brand) | Decide 20GP / 40GP / 40HQ before booking; avoid mis-booked container costs. |
| Wholesale / distribution ops manager | Pre-screen forwarder quotes; check volume vs payload constraint. |
| Warehouse / ops manager | Sanity-check incoming shipment plans before they arrive at the dock. |
| Freight-forwarder-adjacent CS rep | Quick 1-line shipment sanity check before quoting (v0.2 covers single-line; multi-line is v1.1). |

## 3. User Problem

SMB importers know carton dimensions and quantity but don't reliably know total CBM, container fit, or which constraint (volume vs payload) binds. They over-pay for too-large containers, under-load and pay W/M penalties, or get caught at forwarder confirmation when payload exceeds destination road limits.

## 4. Current Workflow

- Excel formula passed between buyer, supplier, 3PL — error-prone, not mobile.
- Forwarder quote round-trips (1–3 days lost per iteration).
- Generic online CBM calculators — return a number, no fit check, no action recommendation.
- Heavyweight container-loading software (EasyCargo, CubeMaster) — overkill for a pre-booking sanity check.

## 5. Proposed Workflow

1. User opens mobile or desktop tool.
2. Enters one carton spec (L/W/H + unit, quantity, gross weight + unit) and a container choice (20GP/40GP/40HQ + stackable y/n).
3. Tool computes total CBM, total weight, volume %, payload %, fit-or-not, recommended container, and next-step action — instantly, deterministically, no LLM.
4. User reviews result on mobile; copies/saves manually (no PDF/email in v0.2).
5. User takes action: book the recommended container, switch container size, split shipment, or revisit packing.

## 6. MVP Scope (v0.2)

### Inputs (form fields)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Carton length | number + unit (cm / inch) | Yes | Positive, > 0 |
| Carton width | number + unit (cm / inch) | Yes | Same |
| Carton height | number + unit (cm / inch) | Yes | Same |
| Carton quantity | positive integer | Yes | > 0 |
| Gross weight per carton (incl. packaging) | number + unit (kg / lb) | Yes | > 0; label must explicitly say "gross, incl. packaging" |
| Container type | select (20GP / 40GP / 40HQ) | Yes | Default 40GP |
| Stackable | toggle (yes / no) | Yes | Default yes |
| Shipment name | text | Optional | Free-form label |
| Product category | text | Optional | Free-form label |
| Shipment value | number + currency | Optional | Free-form label, no calc |

### Outputs (result card, in priority order per kickoff §5)

1. **Can it fit?** (binary, color-coded)
2. **Best container recommendation** (smallest container that fits both CBM and payload at ≤ 85% volume target)
3. **Volume + payload utilization score** (% each, with band label: under-utilized / healthy / tight / over)
4. **What to do next** (one-line action recommendation from rule table §10)
5. **Supporting detail** (total CBM, total weight, container max CBM / payload, wasted space estimate)

### Out of scope (v1.1+)

CSV upload, multi-SKU rows, email capture, PDF/report download, 3D bin packing, palletization optimizer, forwarder API, live freight rates, login, saved history, subscription, real-LLM-driven supplier email generation.

## 7. Container Constants (v0.2 planning values — SME validated)

| Type | Internal L × W × H (approx.) | Max Volume (CBM) | Max Payload (KG) |
|------|------------------------------|-----------------:|------------------:|
| 20GP | 5.898 × 2.352 × 2.395 m | 33.0 | 28,200 |
| 40GP | 12.032 × 2.352 × 2.395 m | 67.0 | 26,700 |
| 40HQ | 12.032 × 2.352 × 2.698 m | 76.0 | 26,500 |

Source basis: ISO 668 + carrier equipment guides (MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, COSCO, Evergreen). Numbers are within the normal published range; values are conservative-to-mid. Full source breakdown in `data/notes/DATA-PLAN.md` §1.

**Road-weight caveat (must appear when 20GP payload utilization > 75%):** 28,200 kg is the carrier-side ceiling. Destination road GVW limits commonly cap real-world 20GP cargo near 17,000–21,500 kg in US/EU. Confirm with forwarder.

## 8. Deterministic Formulas

```
Carton CBM           = L_m × W_m × H_m         (each dim converted to meters first; no intermediate rounding)
Total CBM            = Carton CBM × quantity
Volume utilization % = Total CBM ÷ Container max CBM
Payload utilization % = (Gross weight kg × quantity) ÷ Container max payload kg
Recommended container = smallest of {20GP, 40GP, 40HQ} that fits both CBM (≤ 85% target) and payload
```

Unit conversion (exact, no rounding):
- 1 inch = 0.0254 m
- 1 cm = 0.01 m
- 1 lb = 0.45359237 kg

Display precision: 2 decimals for CBM, 0 decimals for kg, 1 decimal for utilization %.

## 9. UX Requirements

- **Mobile-first.** First viewport must show input form start + a hint of result card, no horizontal scroll on 375 px wide.
- **Field-level unit toggle.** Each dimension picks cm/inch; each weight picks kg/lb. Default cm + kg.
- **Echo canonical (m, kg) values back to user** before/in the result so unit-mismatch errors are caught.
- **Result card prioritizes action over chart** (per kickoff §5).
- **"Planning estimate" disclaimer always visible** at top of result card.
- **Secondary CTA "Download utilization report" is disabled + labelled "Coming in v1.1"** (per Esther Q5 = A+). Not a broken link, not a fake download.
- **"Generate supplier email draft" placeholder button** disabled with "Coming in v1.1" tooltip. Not interactive in v0.2.
- **Empty / loading / error / success states** all designed (Stage 3 UX deliverable).
- **3 Playground options** explored by UX (Stage 3) — per Esther Q2 = 3. Direction selected by Esther at the UX gate.

## 10. Recommendation Rules (deterministic; no LLM)

| # | Trigger | Action recommendation |
|---|---------|----------------------|
| R1 | Total CBM < 13 AND total weight < 3,500 kg | "Shipment is small for FCL. LCL is often cheaper — ask your forwarder." |
| R2 | Vol util < 50% AND payload util < 50% | "Container is oversized. Consolidate or downsize." |
| R3 | Vol util 50–60% | "Under-utilized. Consider smaller container or add SKUs." |
| R4 | Vol util 60–85% | "Healthy planning range." |
| R5 | Vol util 85–95% | "Tight fit. Confirm carton orientation with forwarder." |
| R6 | Vol util 95–100% | "Real loading may fail. Size up." |
| R7 | Vol util > 100% | "Does not fit. Recommend next container size." |
| R8 | 20GP overflows AND 40GP fits | "Switch to 40GP." |
| R9 | 40GP vol util > 90% | "Compare 40HQ rate — adds ~9 CBM headroom, same payload class." |
| R10 | Payload util > 90% | "Confirm payload with forwarder; check destination road weight limits." |
| R11 | Payload util > 100% | "Over payload. Split shipment or reduce qty." |
| R12 | Stackable = No | "Non-stackable cargo typically achieves 60–70% of theoretical volume utilization. Plan tighter fit." |
| R13 | Carton dim > container internal dim (any axis) | "Carton too large for this container. Consider OOG or repack." Hard fit-fail, not soft warning. |
| R14 | 20GP payload util > 75% | "28,200 kg is the carrier-side cap; road weight limits often cap cargo near 17,000–21,500 kg in US/EU. Confirm with forwarder." |

Rules R1–R14 fire deterministically based on inputs. Multiple rules may apply; show in priority order R13 > R7/R11 > R6/R10/R14 > R8/R9 > R1/R2/R12 > R3/R5 > R4.

## 11. Disclaimer Wording (final UI copy, SME approved)

**Top of result card (always visible):**
> Planning estimate only. Confirm with your forwarder before booking. Actual container capacity depends on carton geometry, loading method, pallets, and destination weight limits.

**Methodology / FAQ section:**
> Container volumes and payload limits used in this tool are typical planning values from carrier equipment guides. They are not loading guarantees. Internal dimensions vary by carrier and container age.

## 12. Acceptance Criteria — concrete test fixtures from SME scenarios

These are the **regression test cases** Dev (Stage 5) and QA (Stage 6) must verify. Each row defines inputs, expected math output, and expected recommendation rule fire.

| ID | Inputs | Expected math | Expected rule fire | Expected user-facing verdict |
|----|--------|---------------|--------------------|------------------------------|
| AC-A1 | 500 ct, 60×40×30 cm, 12 kg, 20GP, stackable=Y | per-ct 0.072 CBM; total 36 CBM, 6,000 kg | 20GP: 109% vol → R7. 40GP: 54% vol → R3 + R8 | "Does not fit in 20GP. Switch to 40GP. Under-utilized at 54% — consider adding SKUs." |
| AC-A2 | 200 ct, 50×40×40 cm, 18 kg, 20GP, stackable=Y | 0.080 CBM/ct; 16 CBM, 3,600 kg | 20GP: 48% vol / 13% pl → R2 borderline; total just above LCL threshold | "20GP fits but oversized. Borderline LCL — confirm rates with forwarder." |
| AC-A3 | 1,000 ct, 60×40×40 cm, 22 kg, 40HQ, stackable=Y | 0.096 CBM/ct; 96 CBM, 22,000 kg | 40HQ: 126% vol → R7; payload OK | "Does not fit in 40HQ. Split shipment (e.g. 2× 40HQ, or 1× 40HQ + 1× 20GP)." |
| AC-B1 | 800 ct, 50×30×40 cm, 8 kg, 40HQ, stackable=Y | 0.060 CBM/ct; 48 CBM, 6,400 kg | 40HQ: 63% vol → R4; 40GP: 72% vol → R4 | "40HQ is over-spec. 40GP fits at healthy 72% utilization." |
| AC-B2 | 100 ct, 200×80×50 cm, 45 kg, 40HQ, stackable=N | 0.800 CBM/ct; 80 CBM, 4,500 kg | 40HQ: 105% vol → R7; R12 (non-stackable) | "Does not fit + non-stackable. Recommend 2× 40HQ or repack." |
| AC-C1 | 50 ct, 100×80×60 cm, 280 kg, 20GP, stackable=Y | 0.480 CBM/ct; 24 CBM, 14,000 kg | 20GP: 73% vol / 50% pl → R4 | "20GP fits at healthy 73% utilization. No flags." |
| AC-C2 | 20 pallets, 120×100×60 cm, 1,200 kg, 20GP, stackable=N | 0.720 CBM/pallet; 14.4 CBM, 24,000 kg | 20GP: 44% vol / 85% pl → R10 + R12 + R14 | "20GP — weight-limited. Confirm road weight with forwarder. Non-stackable derate applies." |
| AC-Validation-1 | Carton length = 0 | n/a | Form blocks submit | Inline validation error: "Length must be > 0." |
| AC-Validation-2 | Carton dim > container internal dim | n/a | R13 fires hard fit-fail | "Carton too large for this container." |
| AC-Unit-1 | 100 ct, 24×16×12 inch, 26 lb, 40GP, stackable=Y | per-ct 0.075 CBM; 7.5 CBM, 1,179 kg | 40GP: 11% vol / 4% pl → R1 (LCL hint) | "Small shipment — LCL likely cheaper." |

Pass criteria: all 10 fixtures return the expected verdict + at minimum the listed rule(s). QA may add additional fixtures.

## 13. Website Placement (Stage 9 Launch prep target)

- **Category:** Ocean Freight & Importing
- **Final URL:** `/tools/ocean-import/container-utilization-checker`
- **Tool card one-liner:** "Check carton CBM, container fit, volume utilization, payload risk, and next-step recommendations before you book freight."
- **Primary CTA:** "Check My Container"
- **Secondary CTA:** "Download utilization report" — disabled + "Coming in v1.1" until v1.1 implementation.

v0.2 ships as a standalone Vercel preview (per Esther Q4 = C); merged into `esther-ho-website` repo after QA pass.

## 14. Monetization Path

- **Phase 1 (v0.2 / v1.0):** free calculator, "Book call" CTA to consultation.
- **Phase 2 (v1.1+):** email-gated PDF / report download, paid detailed shipment review, container-mix optimization report.
- **Phase 3 (later):** saved dashboard, recurring shipment templates, subscription tier.

## 15. Risks and Open Questions

| Risk | Mitigation |
|------|-----------|
| Liability framing — user blames tool for failed loading | Always-visible "planning estimate" disclaimer + "confirm with forwarder" rule fires |
| Unit-mismatch user errors | Field-level unit toggles, canonical (m, kg) echo before computing |
| 20GP road-weight blind spot | R14 fires hint at > 75% payload util |
| Volume > 95% recommends container that won't actually load | R5/R6 fire warnings; recommended-container logic uses 85% target, not 100% |
| Disclaimer ignored on mobile | Top-of-card placement (not footer) — UX (Stage 3) enforces |

**Open questions:** none material. SME pass cleared all v0.2 ambiguity.

## 16. Success Metrics

| Metric | Target |
|--------|--------|
| Tool completion rate (form → result viewed) | > 65% |
| Time-to-result | < 90 s median |
| Mobile session share | > 40% of completions |
| "Book call" CTA click-through | > 5% of completions |
| Esther can review on phone via Vercel preview | Yes (binary) |
| REVIEW-GATE P0 blockers at launch | 0 |

Stage 8 Performance Analyst formalizes Metrics Plan with data sources and review cadence after Dev/QA.

## 17. Definition of Done — v0.2

- **Prototype done** when local Vercel preview computes all 10 AC fixtures correctly.
- **MVP done** when QA REVIEW-GATE has 0 P0 + 0 P1 blockers and Esther confirms the result-page UX matches the chosen Playground direction.
- **Website-ready done** when Stage 9 Website Launch Engineer ships route + analytics + meta + rollback plan and Esther gives final launch approval.

## 18. Recommendation

**Build.** Scope is right, value is real, complexity is low, SMB practicality is high, all v0.2 ambiguity cleared in Stage 1. Proceed to Stage 3 (UX Playground — 3 options) after Esther's PRD light-review OK.

---

**Changes since v0.1 attachment:** §7 added internal dimensions + road-weight caveat. §8 made formulas explicit. §10 promoted SME rule table. §12 NEW — acceptance criteria with 10 concrete test fixtures. §11, §15, §16, §17 newly added. No scope changes from Esther's confirmed v0.2 boundaries.
