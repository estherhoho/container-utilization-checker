# Technical Plan — DOC-41 v0.2 MVP

## 1. Objective
Build the approved Option B teal static MVP for the Container Utilization Checker / CBM Calculator as a standalone client-side tool with deterministic formulas, rule-based recommendations, and a fixture test harness.

## 2. MVP scope
- Single carton line manual input only.
- Client-side CBM, weight, volume utilization, payload utilization, fit, best-container, and recommendation rules.
- Option B dashboard UI with guide card, Try an example, live hints, 2x2 metric cards, circular utilization meters, stacked capacity bar, disabled v1.1 CTA placeholders.
- Regression harness for the 10 PRD fixtures and manual QA notes for the 24 UX acceptance criteria.

## 3. Architecture
- Static HTML/CSS/JS.
- `code/app.js` exposes shared pure calculation functions on `window.CBMTool` and `module.exports` for browser and Node tests.
- No backend, no API calls, no secrets, no paid services.

## 4. Files or components to change
- `code/index.html`
- `code/styles.css`
- `code/app.js`
- `tests/ac-fixtures.html`
- `tests/run-ac-fixtures.js`
- `package.json`
- `outputs/qa-report.md`

## 5. Data flow
User inputs carton dimensions, quantity, weight, selected container, and stackability. The UI converts values to meters/kg, computes totals, evaluates R1-R14, generates a verdict/recommendation, and renders result cards. The fixture harness imports the same calculation functions and verifies math, rules, and key verdict text.

## 6. Dependencies
No runtime dependency. Local verification uses Node and a static HTTP server. Browser screenshots use local Playwright only if available in the environment.

## 7. Risks
- The PRD rule table says R10 triggers at payload >90%, while fixture AC-C2 expects R10 at 85.1% for a 20GP. Implementation treats 20GP at >85% as high-payload to satisfy the locked fixture and road-weight risk.
- Static implementation will be easier to deploy quickly but does not use Ant Design React components directly.
- Vercel/GitHub deployment may be blocked by auth or repo permissions.

## 8. Test plan
- Run `npm test` for all 10 PRD fixtures.
- Open `tests/ac-fixtures.html` in browser for reviewable fixture pass table.
- Run local server and verify desktop and 375px mobile rendering.
- Capture or document checks for UX AC-01 through AC-24, including disabled CTAs and localStorage guide dismissal.
