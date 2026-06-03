# Container Utilization Checker / CBM Calculator

## One-line Description

A static, AI-assisted CBM and container utilization checker for importers, ecommerce brands, and operations teams.

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

## Current Stage

v0.2 static MVP implementation for DOC-41.

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
/tools/ocean-import/container-utilization-checker
```
