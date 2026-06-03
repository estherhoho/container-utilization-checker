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
  "metric-icon"
];

const requiredCopy = [
  "Volume utilization = total shipment CBM / selected container CBM. It shows how much container space your cartons use.",
  "Payload utilization = total gross weight / selected container max payload. It shows whether weight, not space, may become the limit.",
  "Total gross weight",
  "Likely limiting factor:",
  "Recommended:"
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
