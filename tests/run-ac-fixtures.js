const tool = require("../code/app.js");

const fixtures = [
  {
    id: "AC-A1",
    input: { length: 60, width: 40, height: 30, quantity: 500, weight: 12, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" },
    expect: { cartonCbm: 0.072, totalCbm: 36, totalWeightKg: 6000, rules: ["R7", "R8"], actionIncludes: ["Does not fit in 20GP", "Switch to 40GP", "Under-utilized"] }
  },
  {
    id: "AC-A2",
    input: { length: 50, width: 40, height: 40, quantity: 200, weight: 18, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" },
    expect: { cartonCbm: 0.08, totalCbm: 16, totalWeightKg: 3600, rules: ["R2"], actionIncludes: ["20GP fits but oversized", "Borderline LCL"] }
  },
  {
    id: "AC-A3",
    input: { length: 60, width: 40, height: 40, quantity: 1000, weight: 22, dimensionUnit: "cm", weightUnit: "kg", containerType: "40HQ", stackable: "yes" },
    expect: { cartonCbm: 0.096, totalCbm: 96, totalWeightKg: 22000, rules: ["R7"], actionIncludes: ["Does not fit in 40HQ", "Split shipment"] }
  },
  {
    id: "AC-B1",
    input: { length: 50, width: 30, height: 40, quantity: 800, weight: 8, dimensionUnit: "cm", weightUnit: "kg", containerType: "40HQ", stackable: "yes" },
    expect: { cartonCbm: 0.06, totalCbm: 48, totalWeightKg: 6400, rules: ["R4"], actionIncludes: ["40HQ is over-spec", "40GP fits at healthy 72%"] }
  },
  {
    id: "AC-B2",
    input: { length: 200, width: 80, height: 50, quantity: 100, weight: 45, dimensionUnit: "cm", weightUnit: "kg", containerType: "40HQ", stackable: "no" },
    expect: { cartonCbm: 0.8, totalCbm: 80, totalWeightKg: 4500, rules: ["R7", "R12"], actionIncludes: ["Does not fit", "Split shipment"] }
  },
  {
    id: "AC-C1",
    input: { length: 100, width: 80, height: 60, quantity: 50, weight: 280, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" },
    expect: { cartonCbm: 0.48, totalCbm: 24, totalWeightKg: 14000, rules: ["R4"], actionIncludes: ["20GP fits at healthy 73% utilization", "No flags"] }
  },
  {
    id: "AC-C2",
    input: { length: 120, width: 100, height: 60, quantity: 20, weight: 1200, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "no" },
    expect: { cartonCbm: 0.72, totalCbm: 14.4, totalWeightKg: 24000, rules: ["R10", "R12", "R14"], actionIncludes: ["20GP", "weight-limited", "Non-stackable derate applies"] }
  },
  {
    id: "AC-Validation-1",
    input: { length: 0, width: 40, height: 30, quantity: 500, weight: 12, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" },
    expect: { valid: false, errorField: "length", errorText: "Length must be > 0." }
  },
  {
    id: "AC-Validation-2",
    input: { length: 1300, width: 240, height: 250, quantity: 1, weight: 100, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" },
    expect: { rules: ["R13"], actionIncludes: ["Carton too large for this container"] }
  },
  {
    id: "AC-Unit-1",
    input: { length: 24, width: 16, height: 12, quantity: 100, weight: 26, dimensionUnit: "in", weightUnit: "lb", containerType: "40GP", stackable: "yes" },
    expect: { cartonCbm: 0.075, totalCbm: 7.55, totalWeightKg: 1179, rules: ["R1"], actionIncludes: ["Under 13 CBM", "LCL may be cheaper"] }
  },
  {
    id: "AC-Multi-1",
    input: {
      containerType: "20GP",
      lines: [
        { id: "line-a", label: "Furniture cartons", length: 60, width: 40, height: 30, quantity: 300, weight: 12, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" },
        { id: "line-b", label: "Accessories cartons", length: 24, width: 16, height: 12, quantity: 100, weight: 26, dimensionUnit: "in", weightUnit: "lb", stackable: "yes" },
        { id: "line-c", label: "Tile cartons", length: 40, width: 40, height: 20, quantity: 400, weight: 23, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" }
      ]
    },
    expect: {
      totalCbm: 41.95,
      totalWeightKg: 13979,
      totalCartons: 800,
      lineCount: 3,
      recommendedContainer: "40GP",
      largestCbmLabel: "Furniture cartons",
      largestWeightLabel: "Tile cartons",
      rules: ["R7", "R8"],
      actionIncludes: ["Does not fit in 20GP", "Switch to 40GP"]
    }
  }
];

function approx(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runFixture(fixture) {
  const result = tool.calculate(fixture.input);
  const expected = fixture.expect;

  if (expected.valid === false) {
    assert(result.valid === false, `${fixture.id}: expected invalid result`);
    assert(result.errors[expected.errorField] === expected.errorText, `${fixture.id}: expected ${expected.errorField} error`);
    return { id: fixture.id, status: "PASS", detail: result.errors[expected.errorField] };
  }

  assert(result.valid, `${fixture.id}: expected valid result`);
  if (expected.cartonCbm !== undefined) assert(approx(result.cartonCbm, expected.cartonCbm, 0.006), `${fixture.id}: carton CBM ${result.cartonCbm}`);
  if (expected.totalCbm !== undefined) assert(approx(result.totalCbm, expected.totalCbm, 0.06), `${fixture.id}: total CBM ${result.totalCbm}`);
  if (expected.totalWeightKg !== undefined) assert(approx(result.totalWeightKg, expected.totalWeightKg, 2), `${fixture.id}: total kg ${result.totalWeightKg}`);
  if (expected.totalCartons !== undefined) assert(result.totalCartons === expected.totalCartons, `${fixture.id}: total cartons ${result.totalCartons}`);
  if (expected.lineCount !== undefined) assert(result.lineCount === expected.lineCount, `${fixture.id}: line count ${result.lineCount}`);
  if (expected.recommendedContainer !== undefined) assert(result.recommendedContainer === expected.recommendedContainer, `${fixture.id}: recommended ${result.recommendedContainer}`);
  if (expected.largestCbmLabel !== undefined) assert(result.contributors.cbm.label === expected.largestCbmLabel, `${fixture.id}: largest CBM ${result.contributors.cbm.label}`);
  if (expected.largestWeightLabel !== undefined) assert(result.contributors.weight.label === expected.largestWeightLabel, `${fixture.id}: largest weight ${result.contributors.weight.label}`);
  if (result.rows && result.rows.length > 1) {
    const rowCbmTotal = result.rows.reduce((total, row) => total + row.totalCbm, 0);
    const rowWeightTotal = result.rows.reduce((total, row) => total + row.totalWeightKg, 0);
    assert(approx(result.totalCbm, rowCbmTotal, 0.0001), `${fixture.id}: total CBM does not equal row sum`);
    assert(approx(result.totalWeightKg, rowWeightTotal, 0.0001), `${fixture.id}: total weight does not equal row sum`);
  }

  const ruleIds = result.visibleRules.map((rule) => rule.id);
  expected.rules.forEach((rule) => {
    assert(ruleIds.includes(rule), `${fixture.id}: missing rule ${rule}; got ${ruleIds.join(", ")}`);
  });

  expected.actionIncludes.forEach((text) => {
    assert(result.verdict.action.includes(text), `${fixture.id}: action missing "${text}"; got "${result.verdict.action}"`);
  });

  return { id: fixture.id, status: "PASS", detail: `${tool.fmt(result.totalCbm, 2)} CBM, ${tool.fmtInt(result.totalWeightKg)} kg, ${ruleIds.join("/")}` };
}

function runAll() {
  const rows = [];
  let failures = 0;
  fixtures.forEach((fixture) => {
    try {
      rows.push(runFixture(fixture));
    } catch (error) {
      failures += 1;
      rows.push({ id: fixture.id, status: "FAIL", detail: error.message });
    }
  });
  return { rows, failures, passed: fixtures.length - failures, total: fixtures.length };
}

if (require.main === module) {
  const report = runAll();
  report.rows.forEach((row) => {
    console.log(`${row.status} ${row.id} - ${row.detail}`);
  });
  console.log(`${report.passed}/${report.total} fixtures passed`);
  if (report.failures > 0) process.exit(1);
}

module.exports = { fixtures, runAll };
