const fs = require("node:fs");
const path = require("node:path");
const { zipSync, strToU8 } = require("fflate");
const readXlsxFile = require("read-excel-file/node").default;
const tool = require("../code/app.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellRef(col, row) {
  let letters = "";
  let value = col + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    value = Math.floor((value - mod) / 26);
  }
  return letters + row;
}

function sheetXml(rows) {
  const rowMarkup = rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const ref = cellRef(colIndex, rowIndex + 1);
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowMarkup}</sheetData></worksheet>`;
}

function createWorkbook(filePath, sheets) {
  const contentTypes = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join(""),
    `</Types>`
  ].join("");
  const workbookSheets = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const workbookRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const files = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>`)
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet.rows));
  });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(zipSync(files)));
}

function runCase(id, fn) {
  try {
    fn();
    console.log(`PASS ${id}`);
  } catch (error) {
    console.log(`FAIL ${id} - ${error.message}`);
    return 1;
  }
  return 0;
}

async function runAsyncCase(id, fn) {
  try {
    await fn();
    console.log(`PASS ${id}`);
  } catch (error) {
    console.log(`FAIL ${id} - ${error.message}`);
    return 1;
  }
  return 0;
}

async function main() {
  let failures = 0;

  failures += runCase("import-standard-csv", () => {
    const csv = `"Item","Length (cm)","Width (cm)","Height (cm)","Carton Qty","Gross Weight / Ctn (kg)","Stackable"\n"SKU A","40","30","25","100","12","Yes"\n"SKU B","60","45","35","40","18","No"`;
    const review = tool.analyzeImportRows(tool.parseCsvText(csv));
    assert(review.valid, `CSV review should be valid: ${review.error}`);
    assert(review.importedRows.length === 2, `expected 2 imported rows, got ${review.importedRows.length}`);
    assert(review.importedRows[1].stackable === false, "expected non-stackable CSV row");
  });

  failures += await runAsyncCase("import-standard-xlsx", async () => {
    const filePath = path.join(__dirname, "..", "work", "fixtures", "standard-import.xlsx");
    createWorkbook(filePath, [
      { name: "Packing List", rows: [
        ["Item", "Length (cm)", "Width (cm)", "Height (cm)", "Carton Qty", "Gross Weight / Ctn (kg)", "Stackable"],
        ["XLSX SKU", "50", "40", "30", "10", "12", "Yes"]
      ] },
      { name: "Notes", rows: [["Note"], ["Do not import"]] }
    ]);
    const sheets = await readXlsxFile(filePath);
    assert(Array.isArray(sheets) && sheets.length === 2, "expected multi-sheet workbook");
    const review = tool.analyzeImportRows(sheets[0].data);
    assert(review.valid, `XLSX review should be valid: ${review.error}`);
    assert(review.importedRows.length === 1, `expected 1 XLSX row, got ${review.importedRows.length}`);
    assert(review.importedRows[0].label === "XLSX SKU", "expected XLSX label");
  });

  failures += runCase("import-chinese-headers", () => {
    const rows = [
      ["基础信息", "", "外箱尺寸", "", "", "数量重量", "", ""],
      ["品名", "型号", "长", "宽", "高", "箱数", "单箱毛重", "重量单位"],
      ["工厂 SKU A", "A-100", "40", "30", "25", "50", "12", "kg"],
      ["工厂 SKU B", "B-200", "60", "40", "35", "30", "18", "kg"],
      ["合计", "", "", "", "", "80", "30", "kg"]
    ];
    const detected = tool.mapHeaders(["品名", "型号", "长", "宽", "高", "箱数", "单箱毛重", "重量单位"]).mapping;
    assert(Object.keys(detected).length >= 6, `expected >=6 mapped Chinese fields, got ${Object.keys(detected).length}`);
    const review = tool.analyzeImportRows(rows);
    assert(review.valid, `Chinese header review should be valid: ${review.error}`);
    assert(review.twoRowHeader, "expected two-row merged header detection");
    assert(review.importedRows.length === 2, `expected 2 Chinese rows, got ${review.importedRows.length}`);
    assert(review.totalsRows === 1, `expected 1 totals row, got ${review.totalsRows}`);
  });

  failures += runCase("import-combined-dimensions", () => {
    const rows = [
      ["SKU", "Carton Size", "CTNS", "Gross Weight"],
      ["Combo A", "40x30x25", "15", "9"],
      ["Combo B", "50*35*28", "12", "10"],
      ["Missing", "", "10", "8"],
      ["TOTAL", "", "37", ""]
    ];
    const review = tool.analyzeImportRows(rows);
    assert(review.valid, `combined dimension review should be valid: ${review.error}`);
    assert(review.importedRows.length === 2, `expected 2 imported rows, got ${review.importedRows.length}`);
    assert(review.importedRows[0].length === 40 && review.importedRows[0].width === 30 && review.importedRows[0].height === 25, "40x30x25 did not split");
    assert(review.importedRows[1].length === 50 && review.importedRows[1].width === 35 && review.importedRows[1].height === 28, "50*35*28 did not split");
    assert(review.excludedRows.length === 1, `expected 1 excluded row, got ${review.excludedRows.length}`);
    assert(review.totalsRows === 1, `expected 1 totals row, got ${review.totalsRows}`);
  });

  failures += runCase("import-row-cap", () => {
    const rows = [["SKU", "Length", "Width", "Height", "Cartons", "Gross Weight"]];
    for (let index = 0; index < 501; index += 1) rows.push([`SKU-${index}`, "40", "30", "25", "1", "5"]);
    const review = tool.analyzeImportRows(rows);
    assert(!review.valid, "501-row file should be blocked");
    assert(review.error.includes("500"), `row-cap error should mention 500: ${review.error}`);
  });

  if (failures) process.exit(1);
}

main();
