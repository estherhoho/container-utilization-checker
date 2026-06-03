# PRODUCT-SPEC — Container Utilization Checker / CBM Calculator

## Product Overview

Container Utilization Checker helps importers and operations teams calculate carton CBM, compare 20GP / 40GP / 40HQ container fit, and identify wasted space or payload risk before booking freight.

## Target User

Primary:

- Ecommerce importer
- Wholesale / distribution operator
- Operations manager handling international shipments

Secondary:

- Warehouse manager
- Founder / owner reviewing freight cost
- Freight-forwarder-adjacent user preparing shipment details

## Job To Be Done

When I have carton dimensions and quantities for an import shipment, I want to quickly know whether it fits in a container and how well the space is used, so I can avoid freight surprises and decide whether to adjust carton size, split shipment, or ask my forwarder for a better option.

## User Problem

SMB importers often know carton dimensions and quantity, but they do not know:

- total CBM
- whether the shipment fits a 20GP / 40GP / 40HQ
- whether volume or weight is the constraint
- whether the chosen container wastes too much space
- what to ask the supplier or forwarder next

## Current Alternatives

- Manual Excel formulas
- Forwarder quote back-and-forth
- Generic CBM calculators with no action recommendation
- Full container loading software that is too heavy for first check

## MVP Scope

The MVP is a static web calculator.

Esther-confirmed v0.2 scope decisions as of 2026-06-02:

- Support single carton line manual input first.
- Defer CSV upload and multiple SKU/carton lines to v1.1.
- Do not add email capture or PDF/report download in the first build.
- Keep "Download utilization report" as a future CTA only; do not ship a broken or placeholder download button.
- Use the current 20GP / 40GP / 40HQ planning constants, clearly labeled as estimates.

Inputs:

- carton length
- carton width
- carton height
- unit: inch / cm
- carton quantity
- gross weight per carton
- weight unit: lb / kg
- container type: 20GP / 40GP / 40HQ
- stackable: yes / no

Outputs:

- total CBM
- total gross weight
- selected container volume
- selected container payload
- volume utilization %
- payload utilization %
- fit / not fit
- over-payload warning
- recommended container type
- wasted space estimate
- action recommendation

## AI / Recommendation Element

Core calculations must be deterministic.

The AI-assisted layer can be rule-based in v1:

- If utilization is low, suggest carton consolidation, shipment consolidation, or reviewing carton dimensions.
- If payload is high, suggest checking payload with forwarder, splitting shipment, or reviewing packaging weight.
- If 20GP does not fit but 40GP does, recommend 40GP.
- If 40GP is close to full and 40HQ improves volume, suggest comparing 40HQ rate.
- Generate a supplier / forwarder email draft.

## Out Of Scope

Not included in v1:

- 3D bin packing
- visual loading plan
- photo container scan
- palletization optimization
- forwarder API
- ocean rate monitoring
- login
- saved history
- subscription

## Data Plan

See:

```text
data/notes/DATA-PLAN.md
```

## Website Placement

Category:

```text
Ocean Freight & Importing
```

URL:

```text
/tools/ocean-import/container-utilization-checker
```

Primary CTA:

```text
Check My Container
```

Secondary CTA:

```text
Download utilization report (future CTA; not active in v0.2)
```

## Monetization Path

Phase 1:

- Free calculator
- Email-gated PDF/report in a later private beta step
- Book call CTA

Phase 2:

- Paid detailed shipment review
- Container mix optimization report
- Setup service for recurring importer shipment templates

Phase 3:

- Saved dashboard or recurring shipment templates

## Success Criteria

MVP is successful if:

- User can complete the calculator in under 3 minutes.
- User gets a clear fit / not-fit answer.
- User sees whether volume or weight is the limiting factor.
- User gets one clear next action.
- Page works on mobile.
- Esther can review through Vercel preview.
- REVIEW-GATE has no P0 blocker.
