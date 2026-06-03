const fs = require("fs");
const path = require("path");

const codeDir = path.join(__dirname, "..", "code");
const runnableCode = [
  fs.readFileSync(path.join(codeDir, "index.html"), "utf8"),
  fs.readFileSync(path.join(codeDir, "app.js"), "utf8")
].join("\n");

const removedCopy = [
  "Optional: Add shipment details",
  "What to do next",
  "Generate Supplier Email Draft",
  "Download Utilization Report",
  "v1.1 placeholders",
  "metric-icon",
  "Large carton",
  "Light cargo",
  "Medium density"
];

const requiredCopy = [
  "Capacity uses typical container planning values:",
  "LCL candidate is flagged only when the shipment is under 13 CBM and 3,500 kg.",
  "Used",
  "Max",
  "Remaining",
  "Total gross weight",
  "Likely limiting factor:",
  "Recommended:",
  "Oversized cartons: confirm stackability",
  "Bulky cargo: space may fill before weight",
  "Weight and space look balanced",
  "Dense cargo: payload may become the limit",
  "Shipment lines",
  "Total cartons",
  "Planning notes",
  "Largest space contributor",
  "Largest weight contributor",
  "Row total CBM"
];

let failures = 0;

removedCopy.forEach((text) => {
  if (runnableCode.includes(text)) {
    failures += 1;
    console.log(`FAIL removed copy still present: ${text}`);
  } else {
    console.log(`PASS removed copy absent: ${text}`);
  }
});

requiredCopy.forEach((text) => {
  if (runnableCode.includes(text)) {
    console.log(`PASS required copy present: ${text}`);
  } else {
    failures += 1;
    console.log(`FAIL required copy missing: ${text}`);
  }
});

const orderedCopy = [
  "CBM Summary",
  "Container Fit",
  "Volume Utilization",
  "Payload Utilization"
];

orderedCopy.reduce((previousIndex, text) => {
  const currentIndex = runnableCode.indexOf(text);
  if (currentIndex === -1) {
    failures += 1;
    console.log(`FAIL hierarchy copy missing: ${text}`);
  } else if (currentIndex <= previousIndex) {
    failures += 1;
    console.log(`FAIL hierarchy order wrong at: ${text}`);
  } else {
    console.log(`PASS hierarchy order includes: ${text}`);
  }
  return currentIndex;
}, -1);

if (failures) process.exit(1);
