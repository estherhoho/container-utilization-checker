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
  "v1.1 placeholders"
];

const requiredCopy = [
  "Payload utilization = total gross weight / selected container max payload",
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

if (failures) process.exit(1);
