# DATA-PLAN — Container Utilization Checker / CBM Calculator

Stage 1 reference notes for deterministic core math, container constants, unit conversion, industry benchmarks, and disclaimer wording. Owned by Supply Chain SME. Approved for v0.2 MVP.

Target project path: `data/notes/DATA-PLAN.md`
Project: Container Utilization Checker / CBM Calculator (DOC-34)
Last validated: 2026-06-02

---

## 1. Container Constants (v0.2 planning values)

| Type | Internal L × W × H (approx.) | Max Volume (CBM) | Max Payload (KG) |
|------|------------------------------|-----------------:|------------------:|
| 20GP | 5.898 × 2.352 × 2.395 m | 33.0 | 28,200 |
| 40GP | 12.032 × 2.352 × 2.395 m | 67.0 | 26,700 |
| 40HQ | 12.032 × 2.352 × 2.698 m | 76.0 | 26,500 |

These are **planning estimates** suitable for a pre-booking sanity check. Internal dimensions and tare weights vary by manufacturer, carrier, and container age. Numbers above are within the normal published range across major carriers (MSC, Maersk, CMA CGM, Hapag-Lloyd, COSCO, ONE, Evergreen). They should not be treated as a loading guarantee.

### Source basis

- **ISO 668** General Purpose freight container standard for external dimensions and gross weight ceiling (30,480 kg).
- **Carrier equipment guides** (MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE) — typical published internal volumes:
  - 20GP: 33.0 – 33.2 CBM
  - 40GP: 67.0 – 67.7 CBM
  - 40HQ: 75.5 – 76.4 CBM
- **Payload values** are derived from typical max gross (30,480 kg) minus typical container tare (~2,200–2,280 kg for 20GP, ~3,750–3,800 kg for 40GP, ~3,900–4,000 kg for 40HQ). The 20GP figure of 28,200 kg matches the carrier-side ceiling. See §5 for the road/port limit caveat.

### Recommendation on the v0.2 constants

Approved as-is for the calculator. Three SME annotations to surface in UI copy:

1. **20GP 28,200 kg is the carrier-side ceiling, not the typical road limit.** Many destinations (US, EU, parts of Asia) enforce a road GVW that effectively caps a single 20GP container's cargo at ~17,000–21,500 kg once chassis and tractor are deducted. Show a "confirm with forwarder" hint when payload utilization on 20GP exceeds ~75%.
2. **40HQ +9 CBM volume headroom vs 40GP, same payload class.** When 40GP volume utilization exceeds ~90%, the tool should surface 40HQ as a "compare rate" suggestion.
3. **Wording must say "planning estimate" everywhere these numbers appear.** See §6.

---

## 2. CBM Formula

CBM (cubic meters) is the trade-standard volume unit for ocean freight planning.

```
Carton CBM         = L_m × W_m × H_m
Total CBM          = Carton CBM × Quantity
Volume utilization = Total CBM ÷ Container max CBM
Payload utilization = (Gross weight per carton × Quantity) ÷ Container max payload kg
```

All length values must be in meters before multiplication. All weight values must be in kilograms.

### Reference

- CBM is the implicit denominator in W/M ("weight or measure") ocean freight billing: 1 CBM ≡ 1,000 kg revenue ton, whichever yields the higher rate.
- Used by every NVOCC and forwarder quote system.

---

## 3. Unit Conversion

Use exact ratios. No rounding before the final calculation.

| From | To | Multiplier |
|------|----|-----------:|
| inch | meter | 0.0254 |
| inch | centimeter | 2.54 |
| centimeter | meter | 0.01 |
| centimeter | inch | 1 ÷ 2.54 = 0.393700787… |
| meter | inch | 1 ÷ 0.0254 = 39.3700787… |
| pound (lb) | kilogram (kg) | 0.45359237 |
| kilogram (kg) | pound (lb) | 1 ÷ 0.45359237 = 2.20462262… |

### Implementation notes

- Convert each carton dimension to meters before computing carton CBM. Do not convert CBM after the fact.
- Convert gross weight per carton to kg before multiplying by quantity.
- Round only at the display layer. Recommended display precision: 2 decimals for CBM, 0 decimals for kg, 1 decimal for utilization %.

---

## 4. Industry Typical Utilization Benchmarks

Numbers below are reasonable planning targets for SMB importers using ocean FCL service. They are not contractual.

| Metric | Typical planning target | Notes |
|--------|------------------------|-------|
| Volume utilization (cuboid cartons, stackable) | 80–85% | Most importers do not exceed 85% in real loading because of carton tessellation and door-end clearance. |
| Volume utilization (non-stackable) | 60–70% | Single-layer load loses upper container volume. Apply ~0.75–0.85 derate. |
| Payload utilization (sea freight, no road constraint) | up to 90% | Above 90% triggers forwarder confirmation. |
| Payload utilization (US/EU road constraint) | 55–75% of carrier max | Destination GVW limits cap real-world payload. |
| Fill rate for LCL (Less than Container Load) | < ~13–15 CBM | Below this, LCL is usually cheaper than dedicated FCL. |

### When NOT to use FCL

- Total CBM under ~13 CBM AND total weight under ~3,500 kg → LCL is normally cheaper.
- This is **out of scope for v0.2 calculator output** but the recommendation rule in §7 can surface it as a hint.

---

## 5. Caveats

Show these as a disclosure section under the result card, and reference them in the methodology / FAQ:

1. Volume utilization assumes cuboid cartons with no orientation constraints and ideal packing geometry. Real loading rarely reaches the theoretical maximum.
2. Container internal dimensions vary by carrier, manufacturer, and container age. Differences of ±0.5 CBM are common.
3. Stackable = No reduces the usable volume. The calculator applies a flag, not a hard derate, in v0.2.
4. Payload values are carrier-side ceilings. Destination road, rail, and port weight limits may be lower. A 20GP in the US is commonly capped near 17,000–21,500 kg cargo on the road.
5. The calculator does not perform 3D bin packing, palletization optimization, or out-of-gauge (OOG) handling. Carton > container internal dimension means physical fit fail, period.
6. The tool does not compare freight rates. It compares **fit and utilization**, not price.

---

## 6. Disclaimer Wording (recommended UI copy)

**Top of result card (always visible):**

> Planning estimate only. Confirm with your forwarder before booking. Actual container capacity depends on carton geometry, loading method, pallets, and destination weight limits.

**Container constants section (methodology / FAQ):**

> Container volumes and payload limits used in this tool are typical planning values from carrier equipment guides. They are not loading guarantees. Internal dimensions vary by carrier and container age.

**Stackable = No hint:**

> Non-stackable cargo typically achieves 60–70% of theoretical volume utilization. Plan for tighter real-world fit.

**Payload warning (over 90% on 20GP, over 85% on 40GP/40HQ):**

> Payload is close to the carrier-side ceiling. Confirm with your forwarder; destination road or port weight limits may be lower.

---

## 7. Recommendation Rules (Stage 1 SME proposal — feeds Stage 4 PRD)

These are the rule-based recommendation thresholds the SME proposes for v0.2. Final rule wording belongs in PRODUCT-SPEC and DEV-PLAN; this section locks the thresholds.

| Trigger | Action recommendation |
|---------|----------------------|
| Total CBM < ~13 AND total weight < ~3,500 kg | Consider LCL instead of FCL. |
| Volume utilization < 50% AND payload utilization < 50% | Container is oversized; consolidate or downsize. |
| Volume utilization 50–60% | Under-utilized; consider smaller container or adding SKUs. |
| Volume utilization 60–85% | Healthy planning range. |
| Volume utilization 85–95% | Tight. Confirm carton orientation with forwarder. |
| Volume utilization 95–100% | Real loading likely to fail; size up. |
| Volume utilization > 100% | Does not fit. Recommend next container size. |
| 20GP overflows AND 40GP fits | Switch to 40GP. |
| 40GP volume utilization > 90% | Compare 40HQ rate (+9 CBM headroom, same payload class). |
| Payload utilization > 90% | Confirm payload with forwarder; check road weight limits. |
| Payload utilization > 100% | Over payload. Split shipment or replan. |
| Stackable = No | Apply ~75–85% volume derate hint. |
| Carton dimension > container internal dimension | Physical fit fail. Consider OOG container or repack. |

---

## 8. Out of Scope (v0.2 — do not validate)

- CSV upload, multi-SKU input
- 3D bin packing, palletization
- Live freight rate comparison
- Forwarder API integration
- Email capture, PDF report download
- Saved history, login, recurring shipment templates

These belong to v1.1 or later. Disclose them as future scope in the FAQ section, not as broken UI affordances.

---

## 9. Validation History

- 2026-06-02: Initial SME validation pass. Approved 20GP / 40GP / 40HQ constants for MVP planning with the road-weight caveat. Approved CBM formula. Approved recommendation thresholds in §7.
