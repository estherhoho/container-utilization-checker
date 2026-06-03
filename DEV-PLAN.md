# DEV-PLAN — Container Utilization Checker

## Build Type

Static HTML/CSS/JS.

## Esther-Confirmed v0.2 Constraints

- Build a single-carton-line manual calculator first.
- Do not implement CSV upload, multi-line SKU input, email capture, or PDF/report download in v0.2.
- If a report/download CTA is shown, it must be clearly marked as future/coming soon or omitted from the interactive UI.
- Container constants below are approved for MVP planning estimates and must be labeled as estimates in the UI.

## Files

```text
code/
├── index.html
├── styles.css
└── app.js
```

## Core Functions

`convertLengthToMeters(value, unit)`

- Converts cm / inch to meters.

`convertWeightToKg(value, unit)`

- Converts lb / kg to kg.

`calculateCartonCbm(length, width, height, unit)`

- Returns CBM per carton.

`calculateShipment(input)`

- total CBM
- total gross weight
- volume utilization
- payload utilization
- fit / not fit
- limiting factor

`recommendContainer(input)`

- Compares 20GP / 40GP / 40HQ.
- Returns recommended type.

`generateRecommendation(result)`

- Rule-based next action.

## Container Constants

Initial practical planning values. Esther approved these for MVP estimates on 2026-06-02; SME should still validate wording before public launch.

| Type | Max Volume CBM | Max Payload KG |
|---|---:|---:|
| 20GP | 33.0 | 28200 |
| 40GP | 67.0 | 26700 |
| 40HQ | 76.0 | 26500 |

Note: Actual usable volume varies by carton shape, loading method, pallets, and carrier/container specs. Tool should present this as a planning estimate, not a loading guarantee.

## Validation Rules

- Dimensions must be positive.
- Quantity must be positive integer.
- Gross weight must be positive.
- Warn if utilization > 95% because real loading may fail.
- Warn if payload utilization > 90%.
- Warn if stackable = no and volume estimate may be optimistic.

## UI States

- Empty state
- Valid result
- Does not fit
- Over payload
- Low utilization
- High-risk close-to-limit
- Mobile layout

## Local Run

```bash
cd /Users/estherho/sc_product/products/container-utilization-checker/code
python3 -m http.server 8766
```

Then open:

```text
http://127.0.0.1:8766/
```

## Deployment

Use Vercel preview for review.

Do not production launch until REVIEW-GATE passes and Esther approves.
