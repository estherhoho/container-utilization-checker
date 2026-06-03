const tool = require("../code/app.js");

const cases = [
  ["R1", { length: 24, width: 16, height: 12, quantity: 100, weight: 26, dimensionUnit: "in", weightUnit: "lb", containerType: "40GP", stackable: "yes" }],
  ["R2", { length: 50, width: 40, height: 40, quantity: 200, weight: 18, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R3", { length: 60, width: 40, height: 30, quantity: 500, weight: 12, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" }],
  ["R4", { length: 100, width: 80, height: 60, quantity: 50, weight: 280, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R5", { length: 100, width: 60, height: 50, quantity: 100, weight: 10, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R6", { length: 100, width: 64, height: 50, quantity: 100, weight: 10, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R7", { length: 60, width: 40, height: 30, quantity: 500, weight: 12, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R8", { length: 60, width: 40, height: 30, quantity: 500, weight: 12, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }],
  ["R9", { length: 100, width: 100, height: 62, quantity: 100, weight: 10, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" }],
  ["R10", { length: 40, width: 40, height: 40, quantity: 250, weight: 100, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" }],
  ["R11", { length: 40, width: 40, height: 40, quantity: 300, weight: 100, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" }],
  ["R12", { length: 50, width: 50, height: 50, quantity: 100, weight: 10, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "no" }],
  ["R13", { length: 1300, width: 240, height: 250, quantity: 1, weight: 100, dimensionUnit: "cm", weightUnit: "kg", containerType: "40GP", stackable: "yes" }],
  ["R14", { length: 40, width: 40, height: 40, quantity: 100, weight: 220, dimensionUnit: "cm", weightUnit: "kg", containerType: "20GP", stackable: "yes" }]
];

const messages = Object.values(tool.RULE_MESSAGES);
const uniqueMessages = new Set(messages);
if (uniqueMessages.size !== messages.length) {
  throw new Error("Rule messages are not distinct");
}

let failures = 0;
cases.forEach(([rule, input]) => {
  const result = tool.calculate(input);
  const ruleIds = result.visibleRules.map((item) => item.id);
  if (!ruleIds.includes(rule)) {
    failures += 1;
    console.log(`FAIL ${rule} - got ${ruleIds.join(", ")}`);
  } else {
    console.log(`PASS ${rule} - ${tool.RULE_MESSAGES[rule]}`);
  }
});

console.log(`${cases.length - failures}/${cases.length} rules covered`);
if (failures) process.exit(1);
