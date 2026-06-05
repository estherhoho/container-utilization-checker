# Container Utilization Checker / CBM Calculator

## One-line Description

A static CBM and container utilization checker for importers, ecommerce brands, and operations teams. It supports manual multi-shipment input, deterministic CSV/XLSX packing-list import, container fit guidance, and light/dark website embedding.

## Target Users

- Importers
- Ecommerce brands
- Wholesale / distribution teams
- Warehouse / operations managers
- Freight forwarder-adjacent users who need quick shipment checks

## Use Cases

- Check if cartons fit in 20GP / 40GP / 40HQ.
- Estimate total CBM.
- Estimate volume utilization.
- Estimate payload utilization.
- Compare container options before booking freight.
- Generate an action recommendation when utilization is low or payload risk is high.

## AI Element

The calculation layer is deterministic. AI or rule-based logic is used only for:

- explaining the result
- recommending next actions
- generating supplier / forwarder email drafts
- creating a report summary

Messy PDF/image/unclean spreadsheet extraction is a v0.5 roadmap item tracked separately in Multica DOC-52. It is not part of the wrapped MVP.

## Current Stage

MVP wrapped and deployed to Dock to AI.

Implemented:

- Multi-shipment/carton line manual entry.
- Total CBM, gross weight, carton, and shipment-line summary.
- Container fit, volume utilization, and payload utilization.
- 20GP, 40GP, and 40HQ comparison.
- CSV/XLSX packing-list upload prototype with deterministic review/import flow.
- Light and dark theme support for both standalone and Dock to AI embedded versions.

## Run Locally

```bash
npm run start
```

Open:

```text
http://localhost:4173
```

## Test

```bash
npm test
```

Browser fixture harness:

```text
tests/ac-fixtures.html
```

## Implementation Files

- `code/index.html`
- `code/styles.css`
- `code/app.js`
- `tests/run-ac-fixtures.js`
- `tests/ac-fixtures.html`
- `tools/capture-screenshots.js`

## Canonical Folder

```text
/Users/estherho/sc_product/products/container-utilization-checker/
```

## Website URL Target

```text
https://www.docktoai.com/toolkit/container-utilization-checker
```

## Standalone Preview

```text
https://container-utilization-checker.vercel.app
```

## Latest Production Commits

```text
Product repo: 6808dd5 Add light and dark theme support
Website repo: 681fe57 Add light and dark themes for toolkit tools
```
