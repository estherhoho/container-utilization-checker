# Container Utilization Checker — v0.4 Packing List Upload PRD

**Status:** SUPERSEDED as the user-facing v0.4 direction — Esther clarified on 2026-06-04 (after v0.4 internal prototype review on DOC-50) that clean template-based upload is **not** the value; the value is uploading messy real documents (PDF, XLSX, image, screenshot) and letting AI extract + clean before user review. New direction is tracked on **DOC-52 (v0.5 AI Messy Upload)**. This v0.4 PRD is preserved as the deterministic baseline: the Review & Map UX, edit-after-import flow, parser, and unchanged calculator remain valuable as the post-AI-extraction review layer and as a deterministic fallback path. The "Download CSV template" button has been removed from the prototype (conflicts with the new direction). Do not extend v0.4; new work happens on DOC-52.

**Original status (preserved for history):** APPROVED for build — Esther authorized direct-to-Developer routing on 2026-06-04 (skipping 5-option UX playground for v0.4 as this is an additive feature on the already-approved v0.3.1 visual tone). v0.4 prototype shipped on DOC-50, Codex internal review passed.
**Stage:** v0.4 spec, pre-build
**Author:** Product Manager (squad lead)
**Inputs:** Issue DOC-49 brief from Codex/Esther; Domain Feasibility Brief from Supply Chain SME
**Parent issue:** DOC-49
**Repo:** https://github.com/estherhoho/container-utilization-checker.git
**Production URL:** https://container-utilization-checker.vercel.app
**Current latest commit:** 7f2bc2a

---

## 1. Product name

Container Utilization Checker — **Packing List Upload** (v0.4 feature)

## 2. Target user

SMB importers, small 3PLs, and SMB shippers who already have a packing list in hand (almost always XLSX or CSV, occasionally exported from a TMS/WMS) and want to know whether the goods fit in a 20'/40'/40HQ container — without retyping 5–50 carton lines by hand.

Secondary: Dock to AI prospects evaluating whether our free tools are useful enough to talk to us.

## 3. User problem

Manual line entry caps the tool's usefulness at ~3–5 lines. Real shipments are 10–80 lines. Today the user either:
- gives up and uses Excel + a rule of thumb, or
- types each row into the calculator (slow, error-prone).

Either way the calculator never sees the full shipment, so the utilization number is approximate at best.

## 4. Current workflow

1. User opens the calculator.
2. User reads their packing list in another window.
3. User types each carton line into the form (length, width, height, qty, weight).
4. User clicks Calculate, sees one container utilization result.
5. To try a different container, repeat.

## 5. Proposed workflow

1. User opens the calculator.
2. User clicks **Upload packing list** (CSV or XLSX) — or drags the file onto the shipment-lines area.
3. Tool parses client-side, auto-maps columns, shows a **Review & Map** panel with detected columns, units, and row count.
4. User confirms or overrides mappings/units, then clicks **Import lines**.
5. Imported rows populate the existing shipment-lines table. User can edit/add/remove like normal.
6. User clicks Calculate — existing deterministic calculator runs unchanged.

Manual entry stays as-is. Upload is an optional shortcut, never the only path.

## 6. MVP scope

**In scope:**
- CSV upload (UTF-8, comma-delimited).
- XLSX upload (lazy-loaded SheetJS community edition, bundled — no CDN).
- Single-file upload only.
- Tab picker for multi-tab XLSX; default to first non-empty tab, require user confirm.
- Auto-mapper with case-insensitive, whitespace-tolerant matching against the SME's column-synonym dictionary (English + Chinese headers).
- Unit detection: parse from header suffix → fall back to separate unit column → fall back to user-confirmed default (cm + kg).
- Review & Map panel: shows detected columns, allows per-column manual remap, shows resolved unit per dimension with global override, shows row count, flags excluded rows.
- Deterministic edge-case handling for the SME's top 5:
  1. Skip rows with missing dimensions; surface them in the review panel.
  2. Detect & silently drop `TOTAL`/`合计` summary rows.
  3. Auto-split combined dimension cells (`40x30x25`, `40*30*25`, `40 × 30 × 25`).
  4. Handle 2-row merged headers by concatenating parent + child.
  5. Tab picker for multi-tab XLSX.
- Stackable defaults to Yes when column absent; UI surfaces this assumption.
- Downloadable CSV template (button near the upload control).
- Validation messages: empty file, no rows after header, no mappable columns, file too large (cap at 500 rows for MVP), unsupported file type.
- Existing manual entry and "Try an example" button continue to work unchanged.
- Existing calculator (CBM, gross weight, container fit, volume utilization, payload utilization) unchanged.

**Out of scope (deferred to v0.5+ or indefinitely):**
- PDF packing lists (OCR + table extraction).
- Photo / image packing lists.
- Multi-tab merge (picker only in v0.4).
- LLM-based column mapping or SKU dedupe.
- Persisted import history (no backend).
- Drag-and-drop multiple files at once.
- Pallet-level calculations.
- Currency, HS codes, country of origin, customs value fields.
- Backend, paid APIs, OpenAI/any LLM.
- Auto-deploy without Codex review.

## 7. Data inputs and outputs

**Inputs:**
- File: `.csv` (UTF-8) or `.xlsx`.
- Recognized columns (see SME synonym list in section 11):
  - Item / SKU (label only, not a key)
  - Length, Width, Height (numeric)
  - Dimension unit (cm / in / mm; default cm)
  - Carton quantity (integer)
  - Gross weight per carton (numeric)
  - Weight unit (kg / lb; default kg; `g` triggers a warning — likely per-unit)
  - Stackable (Y/N; default Yes)

**Outputs:**
- Shipment-lines table populated with one row per parsed line.
- Review panel summary: "X rows imported, Y rows excluded (reason), Z totals rows ignored, units resolved to cm + kg."
- Downstream calculator output unchanged.

## 8. UX requirements

UX Product Designer will own the detailed spec. Constraints for the playground:

- Upload control must be discoverable from the shipment-lines area AND near "Try an example."
- Review & Map panel must show: detected column → mapped field, with a dropdown to override per column; resolved dimension unit + weight unit with global override; row count; excluded row count with expandable detail.
- Empty / loading / error / success states all designed.
- Mobile: no horizontal scroll. Upload may degrade to a simplified review (fewer columns visible at once) but must still work.
- Visual tone consistent with current v0.3.1 (Esther approved).
- **UX playground gate waived for v0.4** — Esther authorized direct-to-Developer routing because (a) the v0.3.1 visual tone is already approved and (b) this is an additive feature, not a redesign. Developer follows the existing visual system; any net-new UI primitives (file drop zone, review-and-map panel, tab picker) should reuse v0.3.1 patterns. If a substantive new visual primitive is needed, Developer should pause and request UX input.

## 9. Acceptance criteria

A v0.4 build is acceptance-ready when ALL are true:

1. `npm test` passes, including new parser/import tests.
2. User can upload a CSV with the standard column names and see all rows populate the shipment-lines table within 2 seconds for files ≤200 rows.
3. User can upload an XLSX with the same standard columns and get the same result.
4. Auto-mapper correctly resolves at least 6 of the 9 fields against a test fixture using Chinese factory headers (e.g. `品名 / 长 / 宽 / 高 / 箱数 / 单箱毛重`).
5. Auto-mapper correctly handles combined-dimension cells (`40x30x25`) when only one dimension column is mapped.
6. Multi-tab XLSX triggers a tab picker; first non-empty tab is the default.
7. Totals/合计 summary rows are silently dropped and surfaced in the review panel.
8. Rows with missing required dimensions are excluded from import and listed in the review panel; user can fill them in inline after import.
9. Manual entry and "Try an example" still work unchanged.
10. Imported rows are editable after import (edit/add/remove behave identically to manually entered rows).
11. Mobile view has no horizontal scroll on the upload flow.
12. Calculator outputs (CBM, gross weight, container fit, %vol util, %payload util) match the equivalent manually entered input within rounding tolerance.
13. Screenshot harness (`node tools/capture-screenshots.js`) runs clean.
14. No backend, no paid API, no CDN-loaded parser, no LLM dependency.
15. Bilingual (EN + ZH) completion summary posted to DOC-49 with approval checklist.

## 10. Risks and open questions

**Risks:**
- **XLSX bundle size**: SheetJS community ~400KB gzipped. Mitigation: lazy-load only when an `.xlsx` is dropped. If still too large, fall back to CSV-only and ship the template-download workaround — but ship-as-is is the recommendation.
- **Auto-mapper false positives**: confidently mapping the wrong column is worse than mapping nothing. Mitigation: show every mapping in the review panel with a clear override; never auto-import without the user clicking Import.
- **Unit assumption**: defaulting to cm + kg when units are absent could silently produce a 2.54× wrong CBM if a US-template file is uploaded. Mitigation: always show resolved unit in the review panel; warn loudly when units were inferred (not parsed).
- **CSV encoding**: UTF-8 BOM and Chinese characters from `cp936`-encoded Excel exports can break naïve parsers. Mitigation: detect BOM; document that non-UTF-8 CSVs may need to be re-saved.

**Open questions for Esther:**
1. **XLSX dependency in v0.4 or defer to v0.5?** SME recommends v0.4 (CSV-only would reject ~55–65% of incoming files). PM agrees. Esther approval needed.
2. **Row cap for MVP**: 500 rows is the proposed cap. Bigger files will refuse with a clear message. OK?
3. **Sample/template download**: include a "Download CSV template" button in v0.4, or defer? PM recommends include.

## 11. Reference — column synonym dictionary (from SME)

Use case-insensitive matching, strip `()[]/_-.` and unit suffixes before compare.

| Field | Synonyms |
| --- | --- |
| Item / SKU | SKU, Item, Item No, Item Code, Product Code, Part No, Model, Style, 品名, 型号, 货号 |
| Length | Length, L, Len, Carton L, Ctn L, Outer L, 长, 长度, 外箱长 |
| Width | Width, W, Wid, Carton W, Ctn W, Outer W, 宽, 宽度, 外箱宽 |
| Height | Height, H, Ht, Carton H, Ctn H, Outer H, Depth, 高, 高度, 外箱高 |
| Dim unit | Dim Unit, Dimension Unit, UOM, Size Unit, Unit (Dim), 尺寸单位, 单位 |
| Carton qty | Cartons, CTN, CTNS, Ctn Qty, Carton Qty, No. of Cartons, Total Cartons, Boxes, Pkgs, Packages, 箱数, 件数 |
| Gross wt/ctn | G.W./CTN, GW/CTN, Gross Wt, Gross Weight, Carton GW, G.W. per Ctn, Wt/Carton, 单箱毛重, 毛重 |
| Wt unit | Wt Unit, Weight Unit, UOM (Wt), 重量单位 |
| Stackable | Stackable, Stack, Non-stack, Stack OK, Y/N, 可堆叠 (default Yes if absent) |

## 12. Success metrics

Defined in detail by Performance Analyst post-build. Initial proposals:

- **Primary**: % of upload sessions that reach a calculation result (target ≥70%).
- **Supporting**: average rows imported per upload; % of uploads needing a manual remap; % of uploads excluded by validation; mix of CSV vs XLSX.
- **Learning question**: do uploaders run more "what if" container scenarios per session than manual users? (signal that upload removes the friction tax.)

## 13. Recommendation

**Build** — CSV + XLSX in v0.4 with the auto-mapper + review-and-edit panel. SME confirms data and workflow reality support this. Calculator stays unchanged. Defer PDF and anything LLM-shaped.

Approved gate sequence (per Esther 2026-06-04):
1. ~~System Design Architect~~ — skipped (no backend, no schema, no auth, no external integrations; below the architecture-brief bar).
2. ~~UX Product Designer playground~~ — skipped per Esther authorization (additive feature on already-approved v0.3.1 visual tone).
3. **Developer — build approved scope only.** (child issue spawned from DOC-49)
4. **QA Reviewer** — function + UX + edge cases + acceptance criteria.
5. Developer fixes any QA blockers.
6. **Performance Analyst** — Product Metrics Plan.
7. **Esther final approval** before any public push (Codex review required for deploy).

## 14. Pre-approved scope decisions (2026-06-04)

Esther confirmed in DOC-49 trigger comment:
- ✅ CSV + XLSX both in v0.4.
- ✅ Client-side only, no PDF/OCR/LLM/backend.
- ✅ Manual entry remains untouched.

PM defaults for the two remaining decisions (Esther can object on the DOC-49 thread; Developer proceeds otherwise):
- ✅ Row cap = 500 rows per file (friendly error above the cap).
- ✅ "Download CSV template" button included in v0.4.

---

## Approval gate — status

- ✅ PRD scope approved (CSV + XLSX, no PDF, no LLM) — Esther 2026-06-04.
- ✅ XLSX in v0.4 — Esther 2026-06-04.
- ✅ Row cap 500 — PM default; Esther may object on DOC-49.
- ✅ CSV template download — PM default; Esther may object on DOC-49.

Build cleared to start. Developer assigned via child issue spawned from DOC-49.

**Next human gate:** Esther final approval before any public push, after QA passes.
