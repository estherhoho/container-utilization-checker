(function attach(root) {
  "use strict";

  var CONTAINERS = {
    "20GP": { type: "20GP", length: 5.898, width: 2.352, height: 2.395, volume: 33, payload: 28200 },
    "40GP": { type: "40GP", length: 12.032, width: 2.352, height: 2.395, volume: 67, payload: 26700 },
    "40HQ": { type: "40HQ", length: 12.032, width: 2.352, height: 2.698, volume: 76, payload: 26500 }
  };

  var ORDERED_CONTAINERS = ["20GP", "40GP", "40HQ"];
  var RULE_PRIORITY = ["R13", "R7", "R11", "R6", "R10", "R14", "R8", "R9", "R1", "R2", "R12", "R3", "R5", "R4"];
  var RULE_MESSAGES = {
    R1: "Likely LCL candidate: under 13 CBM and 3,500 kg. Ask your forwarder to compare LCL vs FCL.",
    R2: "Container is oversized. Consolidate or downsize.",
    R3: "Under-utilized. Consider smaller container or add SKUs.",
    R4: "Healthy planning range.",
    R5: "Tight fit. Confirm carton orientation with forwarder.",
    R6: "Real loading may fail. Size up.",
    R7: "Does not fit. Recommend next container size.",
    R8: "Switch to 40GP.",
    R9: "Compare 40HQ rate — adds ~9 CBM headroom, same payload class.",
    R10: "Confirm payload with forwarder; check destination road weight limits.",
    R11: "Over payload. Split shipment or reduce qty.",
    R12: "Non-stackable cargo typically achieves 60–70% of theoretical volume utilization. Plan tighter fit.",
    R13: "Carton too large for this container. Consider OOG or repack.",
    R14: "28,200 kg is the carrier-side cap; road weight limits often cap cargo near 17,000–21,500 kg in US/EU. Confirm with forwarder."
  };

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    return Number(value);
  }

  function round(value, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function fmt(value, decimals) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtInt(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function dimensionToMeters(value, unit) {
    return unit === "in" ? value * 0.0254 : value * 0.01;
  }

  function weightToKg(value, unit) {
    return unit === "lb" ? value * 0.45359237 : value;
  }

  function getInputLines(input) {
    if (Array.isArray(input.lines)) return input.lines;
    return [{
      id: "line-1",
      label: input.label || input.itemLabel || "",
      length: input.length,
      width: input.width,
      height: input.height,
      quantity: input.quantity,
      weight: input.weight,
      dimensionUnit: input.dimensionUnit || "cm",
      weightUnit: input.weightUnit || "kg",
      stackable: input.stackable
    }];
  }

  function hasAnyLineValue(line) {
    return ["label", "length", "width", "height", "quantity", "weight"].some(function some(field) {
      return line[field] !== null && line[field] !== undefined && String(line[field]).trim() !== "";
    });
  }

  function getLineKey(line, index) {
    return line.id || "line-" + (index + 1);
  }

  function labelForLine(line, index) {
    var label = line.label ? String(line.label).trim() : "";
    return label || "Line " + (index + 1);
  }

  function validateLine(line, index, keyedErrors, isMulti) {
    var errors = {};
    var prefix = isMulti ? getLineKey(line, index) + "." : "";
    var length = toNumber(line.length);
    var width = toNumber(line.width);
    var height = toNumber(line.height);
    var quantity = toNumber(line.quantity);
    var weight = toNumber(line.weight);

    if (!(length > 0)) errors.length = "Length must be > 0.";
    if (!(width > 0)) errors.width = "Width must be > 0.";
    if (!(height > 0)) errors.height = "Height must be > 0.";
    if (!(quantity > 0)) errors.quantity = "Quantity must be > 0.";
    if (quantity > 0 && !Number.isInteger(quantity)) errors.quantity = "Quantity must be a whole number.";
    if (!(weight > 0)) errors.weight = "Gross weight must be > 0.";

    Object.keys(errors).forEach(function each(field) {
      keyedErrors[prefix + field] = errors[field];
    });
    return errors;
  }

  function validateInputs(input) {
    var isMulti = Array.isArray(input.lines);
    var lines = getInputLines(input);
    var activeLines = lines.filter(hasAnyLineValue);
    var linesToValidate = activeLines.length ? lines : lines.slice(0, 1);
    var errors = {};
    var lineErrors = {};
    var validLineCount = 0;

    linesToValidate.forEach(function each(line, index) {
      var originalIndex = lines.indexOf(line);
      var shouldValidate = activeLines.length ? hasAnyLineValue(line) : index === 0;
      if (!shouldValidate) return;
      var keyedLineErrors = validateLine(line, originalIndex, errors, isMulti);
      if (Object.keys(keyedLineErrors).length) {
        lineErrors[getLineKey(line, originalIndex)] = keyedLineErrors;
      } else {
        validLineCount += 1;
      }
    });

    if (!validLineCount && !Object.keys(errors).length) {
      errors[isMulti ? getLineKey(lines[0] || {}, 0) + ".length" : "length"] = "Length must be > 0.";
    }

    return {
      valid: Object.keys(errors).length === 0 && validLineCount > 0,
      errors: errors,
      lineErrors: lineErrors,
      validLineCount: validLineCount
    };
  }

  function normalizeLine(line, index) {
    var dimUnit = line.dimensionUnit || "cm";
    var weightUnit = line.weightUnit || "kg";
    var length = toNumber(line.length);
    var width = toNumber(line.width);
    var height = toNumber(line.height);
    var quantity = toNumber(line.quantity);
    var weight = toNumber(line.weight);
    var lengthM = dimensionToMeters(length, dimUnit);
    var widthM = dimensionToMeters(width, dimUnit);
    var heightM = dimensionToMeters(height, dimUnit);
    var weightKg = weightToKg(weight, weightUnit);
    var cartonCbm = lengthM * widthM * heightM;
    var totalCbm = cartonCbm * quantity;
    var totalWeightKg = weightKg * quantity;

    return {
      id: getLineKey(line, index),
      label: labelForLine(line, index),
      original: {
        label: line.label || "",
        length: length,
        width: width,
        height: height,
        quantity: quantity,
        weight: weight,
        dimensionUnit: dimUnit,
        weightUnit: weightUnit,
        stackable: line.stackable !== "no" && line.stackable !== false
      },
      lengthM: lengthM,
      widthM: widthM,
      heightM: heightM,
      quantity: quantity,
      weightKg: weightKg,
      cartonCbm: cartonCbm,
      totalCbm: totalCbm,
      totalWeightKg: totalWeightKg,
      stackable: line.stackable !== "no" && line.stackable !== false
    };
  }

  function normalizeInput(input) {
    var rows = getInputLines(input)
      .map(normalizeLine)
      .filter(function filter(row) {
        return row.lengthM > 0 && row.widthM > 0 && row.heightM > 0 && row.quantity > 0 && Number.isInteger(row.quantity) && row.weightKg > 0;
      });
    var firstRow = rows[0] || normalizeLine({}, 0);
    var totalCbm = rows.reduce(function sum(total, row) { return total + row.totalCbm; }, 0);
    var totalWeightKg = rows.reduce(function sum(total, row) { return total + row.totalWeightKg; }, 0);
    var totalCartons = rows.reduce(function sum(total, row) { return total + row.quantity; }, 0);

    return {
      original: {
        length: firstRow.original.length,
        width: firstRow.original.width,
        height: firstRow.original.height,
        quantity: totalCartons,
        weight: firstRow.original.weight,
        dimensionUnit: firstRow.original.dimensionUnit,
        weightUnit: firstRow.original.weightUnit,
        containerType: input.containerType || "40GP",
        stackable: rows.every(function every(row) { return row.stackable; }),
        lines: rows
      },
      rows: rows,
      lengthM: firstRow.lengthM,
      widthM: firstRow.widthM,
      heightM: firstRow.heightM,
      quantity: totalCartons,
      weightKg: firstRow.weightKg,
      containerType: input.containerType || "40GP",
      stackable: rows.every(function every(row) { return row.stackable; }),
      totalCbm: totalCbm,
      totalWeightKg: totalWeightKg,
      lineCount: rows.length
    };
  }

  function hasRowDimensionOverflow(row, container) {
    return row.lengthM > container.length || row.widthM > container.width || row.heightM > container.height;
  }

  function hasDimensionOverflow(normalized, container) {
    return normalized.rows.some(function some(row) { return hasRowDimensionOverflow(row, container); });
  }

  function fitsContainer(normalized, type, targetVolume) {
    var shipment = normalized.rows ? normalized : normalizeInput(normalized);
    var container = CONTAINERS[type];
    var maxVolume = targetVolume ? container.volume * targetVolume : container.volume;
    return !hasDimensionOverflow(shipment, container) && shipment.totalCbm <= maxVolume && shipment.totalWeightKg <= container.payload;
  }

  function smallestContainer(normalized, targetVolume) {
    for (var i = 0; i < ORDERED_CONTAINERS.length; i += 1) {
      if (fitsContainer(normalized, ORDERED_CONTAINERS[i], targetVolume)) return ORDERED_CONTAINERS[i];
    }
    return null;
  }

  function getBand(percent) {
    if (percent > 100) return "over";
    if (percent > 95) return "critical";
    if (percent > 85) return "tight";
    if (percent >= 60) return "healthy";
    if (percent >= 50) return "under";
    return "low";
  }

  function getSeverity(ruleId) {
    if (ruleId === "R13" || ruleId === "R7" || ruleId === "R11") return "error";
    if (ruleId === "R6" || ruleId === "R10" || ruleId === "R14" || ruleId === "R5" || ruleId === "R12" || ruleId === "R9") return "warning";
    return "info";
  }

  function uniqueRules(rules) {
    var seen = {};
    return rules.filter(function filter(rule) {
      if (seen[rule.id]) return false;
      seen[rule.id] = true;
      return true;
    });
  }

  function sortRules(rules) {
    return uniqueRules(rules).sort(function sort(a, b) {
      return RULE_PRIORITY.indexOf(a.id) - RULE_PRIORITY.indexOf(b.id);
    });
  }

  function evaluateRules(metrics) {
    var rules = [];
    var n = metrics.normalized;
    var c = metrics.container;
    var volumeUtil = metrics.volumeUtil;
    var payloadUtil = metrics.payloadUtil;

    function add(id) {
      rules.push({ id: id, message: RULE_MESSAGES[id], severity: getSeverity(id) });
    }

    if (metrics.dimensionOverflow) add("R13");
    if (volumeUtil > 100) add("R7");
    if (payloadUtil > 100) add("R11");
    if (volumeUtil > 95 && volumeUtil <= 100) add("R6");
    if (payloadUtil > 90 || (c.type === "20GP" && payloadUtil > 85)) add("R10");
    if (c.type === "20GP" && payloadUtil > 75) add("R14");
    if (c.type === "20GP" && volumeUtil > 100 && fitsContainer(n, "40GP", null)) add("R8");
    if (c.type === "40GP" && volumeUtil > 90) add("R9");
    if (metrics.totalCbm < 13 && metrics.totalWeightKg < 3500) add("R1");
    if (volumeUtil < 50 && payloadUtil < 50) add("R2");
    if (!n.stackable) add("R12");
    if (volumeUtil >= 50 && volumeUtil < 60) add("R3");
    if (volumeUtil > 85 && volumeUtil <= 95) add("R5");
    if (volumeUtil >= 60 && volumeUtil <= 85) add("R4");

    return sortRules(rules);
  }

  function getSanityTagsForLine(row) {
    var validDims = row.lengthM > 0 && row.widthM > 0 && row.heightM > 0;
    if (!validDims || !(row.weightKg > 0)) return [];

    var cartonCbm = row.cartonCbm || row.lengthM * row.widthM * row.heightM;
    var longestCm = Math.max(row.lengthM, row.widthM, row.heightM) * 100;
    var density = row.weightKg / cartonCbm;
    var tags = [];

    if (longestCm >= 40 && longestCm <= 70 && cartonCbm >= 0.04 && cartonCbm <= 0.1) {
      tags.push({ text: "✓ Standard FBA carton", tone: "success" });
    } else if (longestCm > 100 || cartonCbm > 0.4) {
      tags.push({ text: "Oversized cartons: confirm stackability", tone: "warning" });
    } else if (longestCm < 30 && cartonCbm < 0.02) {
      tags.push({ text: "Compact carton", tone: "info" });
    }

    if (density < 100) {
      tags.push({ text: "Bulky cargo: space may fill before weight", tone: "info" });
    } else if (density <= 500) {
      tags.push({ text: "Weight and space look balanced", tone: "success" });
    } else {
      tags.push({ text: "Dense cargo: payload may become the limit", tone: "error" });
    }

    return tags;
  }

  function getSanityTags(normalized) {
    if (normalized.rows && normalized.rows.length) {
      var largest = normalized.rows.slice().sort(function sort(a, b) { return b.totalCbm - a.totalCbm; })[0];
      return getSanityTagsForLine(largest);
    }
    return getSanityTagsForLine(normalized);
  }

  function getLargestContributors(rows) {
    var byCbm = rows.slice().sort(function sort(a, b) { return b.totalCbm - a.totalCbm; })[0] || null;
    var byWeight = rows.slice().sort(function sort(a, b) { return b.totalWeightKg - a.totalWeightKg; })[0] || null;
    return {
      cbm: byCbm,
      weight: byWeight
    };
  }

  function containerRank(type) {
    return ORDERED_CONTAINERS.indexOf(type);
  }

  function buildVerdict(metrics) {
    var selected = metrics.container.type;
    var rec = metrics.recommendedContainer;
    var recStrict = metrics.targetRecommendedContainer;
    var recVolumeUtil = rec ? (metrics.totalCbm / CONTAINERS[rec].volume) * 100 : null;
    var visibleRules = metrics.visibleRules.map(function map(rule) { return rule.id; });

    if (visibleRules.indexOf("R13") >= 0) {
      return {
        badge: "Carton Too Large",
        tone: "error",
        headline: "At least one carton is too large for " + selected + ".",
        action: "Carton too large for this container. Consider OOG or repack."
      };
    }

    if (visibleRules.indexOf("R11") >= 0 && visibleRules.indexOf("R7") < 0) {
      return {
        badge: "Fits (volume) — Over Payload",
        tone: "error",
        headline: selected + " is over payload.",
        action: "Over payload. Split shipment or reduce qty."
      };
    }

    if (visibleRules.indexOf("R7") >= 0) {
      if (rec) {
        var addOn = "";
        if (recVolumeUtil >= 50 && recVolumeUtil < 60) {
          addOn = " Under-utilized at " + fmt(recVolumeUtil, 0) + "% — consider adding SKUs.";
        }
        return {
          badge: "Does Not Fit",
          tone: "error",
          headline: "Does not fit in " + selected + ".",
          action: "Does not fit in " + selected + ". Switch to " + rec + "." + addOn
        };
      }

      return {
        badge: "Does Not Fit",
        tone: "error",
        headline: "Does not fit in " + selected + ".",
        action: "Does not fit in " + selected + ". Split shipment (e.g. 2× 40HQ, or 1× 40HQ + 1× 20GP)."
      };
    }

    if (visibleRules.indexOf("R10") >= 0 || visibleRules.indexOf("R14") >= 0) {
      var stackNote = visibleRules.indexOf("R12") >= 0 ? " Non-stackable derate applies." : "";
      return {
        badge: "Weight Limited",
        tone: "warning",
        headline: selected + " fits by volume, but weight needs review.",
        action: selected + " — weight-limited. Confirm road weight with forwarder." + stackNote
      };
    }

    if (visibleRules.indexOf("R1") >= 0) {
      return {
        badge: "LCL Candidate",
        tone: "warning",
        headline: "Likely LCL candidate for FCL.",
        action: "Under 13 CBM and 3,500 kg — LCL may be cheaper than booking a full container."
      };
    }

    if (visibleRules.indexOf("R2") >= 0) {
      return {
        badge: "Fits",
        tone: "warning",
        headline: selected + " fits but looks oversized.",
        action: selected + " fits but oversized. Borderline LCL — confirm rates with forwarder."
      };
    }

    if (recStrict && recStrict !== selected && containerRank(recStrict) < containerRank(selected)) {
      var recStrictUtil = (metrics.totalCbm / CONTAINERS[recStrict].volume) * 100;
      var utilizationWord = recStrictUtil >= 60 && recStrictUtil <= 85 ? "healthy" : "lower";
      return {
        badge: "Fits",
        tone: "warning",
        headline: selected + " is over-spec.",
        action: selected + " is over-spec. " + recStrict + " fits at " + utilizationWord + " " + fmt(recStrictUtil, 0) + "% utilization."
      };
    }

    if (visibleRules.indexOf("R6") >= 0) {
      return {
        badge: "Tight Fit",
        tone: "warning",
        headline: selected + " is very tight at " + fmt(metrics.volumeUtil, 0) + "% utilization.",
        action: "Real loading may fail. Size up or confirm loading plan with your forwarder."
      };
    }

    if (visibleRules.indexOf("R5") >= 0) {
      return {
        badge: "Fits",
        tone: "warning",
        headline: selected + " is a tight fit at " + fmt(metrics.volumeUtil, 0) + "% utilization.",
        action: "Tight fit. Confirm carton orientation with forwarder."
      };
    }

    if (visibleRules.indexOf("R12") >= 0) {
      return {
        badge: "Fits",
        tone: "warning",
        headline: selected + " fits, with non-stackable caution.",
        action: "Non-stackable cargo typically achieves 60–70% of theoretical volume utilization. Plan tighter fit."
      };
    }

    return {
      badge: "Fits",
      tone: "success",
      headline: selected + " fits at healthy " + fmt(metrics.volumeUtil, 0) + "% utilization.",
      action: selected + " fits at healthy " + fmt(metrics.volumeUtil, 0) + "% utilization. No flags."
    };
  }

  function calculate(input) {
    var validation = validateInputs(input);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, lineErrors: validation.lineErrors };
    }

    var normalized = normalizeInput(input);
    var container = CONTAINERS[normalized.containerType];
    var cartonCbm = normalized.rows.length === 1 ? normalized.rows[0].cartonCbm : 0;
    var totalCbm = normalized.totalCbm;
    var totalWeightKg = normalized.totalWeightKg;
    var volumeUtil = (totalCbm / container.volume) * 100;
    var payloadUtil = (totalWeightKg / container.payload) * 100;
    var dimensionOverflow = hasDimensionOverflow(normalized, container);
    var recommendedContainer = smallestContainer(normalized, null);
    var targetRecommendedContainer = smallestContainer(normalized, 0.85);
    var wastedSpace = Math.max(container.volume - totalCbm, 0);
    var metrics = {
      valid: true,
      normalized: normalized,
      rows: normalized.rows,
      lineCount: normalized.lineCount,
      container: container,
      cartonCbm: cartonCbm,
      totalCbm: totalCbm,
      totalWeightKg: totalWeightKg,
      totalCartons: normalized.quantity,
      volumeUtil: volumeUtil,
      payloadUtil: payloadUtil,
      volumeBand: getBand(volumeUtil),
      payloadBand: getBand(payloadUtil),
      dimensionOverflow: dimensionOverflow,
      recommendedContainer: recommendedContainer,
      targetRecommendedContainer: targetRecommendedContainer,
      wastedSpace: wastedSpace,
      contributors: getLargestContributors(normalized.rows),
      sanityTags: getSanityTags(normalized)
    };

    metrics.rules = evaluateRules(metrics);
    metrics.visibleRules = metrics.rules.some(function some(rule) { return rule.id === "R13"; })
      ? metrics.rules.filter(function filter(rule) { return rule.id === "R13"; })
      : metrics.rules;
    metrics.verdict = buildVerdict(metrics);
    return metrics;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tagMarkup(tag) {
    return '<span class="tag-pill ' + tag.tone + '">' + escapeHtml(tag.text) + "</span>";
  }

  function meterSvg(percent, band, label) {
    var radius = 36;
    var circumference = 2 * Math.PI * radius;
    var capped = Math.max(0, Math.min(percent, 100));
    var dash = circumference - (capped / 100) * circumference;
    var tone = band === "over" || band === "critical" ? "error" : band === "tight" ? "warning" : "";
    return [
      '<svg class="circle-meter" role="img" aria-label="' + escapeHtml(label) + " " + fmt(percent, 1) + '%" viewBox="0 0 88 88">',
      '<circle class="circle-bg" cx="44" cy="44" r="' + radius + '"></circle>',
      '<circle class="circle-fg ' + tone + '" cx="44" cy="44" r="' + radius + '" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + dash + '"></circle>',
      "</svg>"
    ].join("");
  }

  function renderContributorInsights(metrics) {
    if (!metrics.contributors.cbm || !metrics.contributors.weight) return "";
    return [
      '<div class="contributor-list" aria-label="Shipment contributor insights">',
      '<div><span>Largest space contributor</span><strong>' + escapeHtml(metrics.contributors.cbm.label) + " — " + fmt(metrics.contributors.cbm.totalCbm, 2) + " CBM</strong></div>",
      '<div><span>Largest weight contributor</span><strong>' + escapeHtml(metrics.contributors.weight.label) + " — " + fmtInt(metrics.contributors.weight.totalWeightKg) + " kg</strong></div>",
      "</div>"
    ].join("");
  }

  function renderCapacityFigures(kind, used, max, unit, tone) {
    var remaining = Math.max(max - used, 0);
    var usedText = unit === "kg" ? fmtInt(used) : fmt(used, 2);
    var maxText = unit === "kg" ? fmtInt(max) : fmt(max, 1);
    var remainingText = unit === "kg" ? fmtInt(remaining) : fmt(remaining, 2);
    return [
      '<div class="capacity-figures">',
      '<div><span>Used</span><strong>' + usedText + " " + unit + "</strong></div>",
      '<div><span>Max</span><strong>' + maxText + " " + unit + "</strong></div>",
      '<div><span>Remaining</span><strong class="' + tone + '">' + remainingText + " " + unit + "</strong></div>",
      "</div>",
      '<p class="capacity-note">' + escapeHtml(kind) + " utilization uses the selected container's planning capacity.</p>"
    ].join("");
  }

  function renderMetricGrid(metrics, utilizationSuppressed) {
    var fitStatus = metrics.verdict.badge;
    var rec = metrics.targetRecommendedContainer || metrics.recommendedContainer || "Split shipment";
    var recommendedMarkup = '<div class="recommendation-chip"><span>Recommended:</span><strong>' + escapeHtml(rec) + "</strong></div>";
    var limitingFactor = metrics.payloadUtil > metrics.volumeUtil ? "weight" : "space";
    var volumeTone = metrics.volumeBand === "over" || metrics.volumeBand === "critical" ? "error" : metrics.volumeBand === "tight" ? "warning" : "";
    var payloadTone = metrics.payloadBand === "over" || metrics.payloadBand === "critical" ? "error" : metrics.payloadBand === "tight" ? "warning" : "";
    return [
      '<section class="metric-grid" aria-label="Container result metrics">',
      '<div class="metric-card summary-card"><div class="metric-head"><p class="metric-label">CBM Summary</p></div><div class="summary-stack primary-summary"><div><span>Total CBM</span><strong>' + fmt(metrics.totalCbm, 2) + ' m³</strong></div><div><span>Total gross weight</span><strong>' + fmtInt(metrics.totalWeightKg) + ' kg</strong></div><div><span>Total cartons</span><strong>' + fmtInt(metrics.totalCartons) + '</strong></div><div><span>Shipment lines</span><strong>' + fmtInt(metrics.lineCount) + "</strong></div></div></div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Container Fit</p></div><div class="metric-value">' + escapeHtml(fitStatus) + '</div><div class="metric-sub">Likely limiting factor: ' + escapeHtml(limitingFactor) + "</div>" + recommendedMarkup + "</div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Volume Utilization</p></div>' + (utilizationSuppressed ? '<div class="metric-value">Blocked</div><div class="metric-sub">Dimension overflow</div>' : meterSvg(metrics.volumeUtil, metrics.volumeBand, "Volume utilization") + '<div class="metric-value">' + fmt(metrics.volumeUtil, 1) + '%</div><div class="metric-sub">Space use: ' + escapeHtml(metrics.volumeBand) + "</div>" + renderCapacityFigures("Volume", metrics.totalCbm, metrics.container.volume, "CBM", volumeTone)) + "</div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Payload Utilization</p></div>' + meterSvg(metrics.payloadUtil, metrics.payloadBand, "Payload utilization") + '<div class="metric-value">' + fmt(metrics.payloadUtil, 1) + '%</div><div class="metric-sub">Weight use: ' + escapeHtml(metrics.payloadBand) + "</div>" + renderCapacityFigures("Payload", metrics.totalWeightKg, metrics.container.payload, "kg", payloadTone) + "</div>",
      "</section>"
    ].join("");
  }

  function renderChart(metrics, volumeFill, volumeTone) {
    return [
      '<section class="chart-card" aria-label="Capacity visualization">',
      '<div class="chart-title"><h3>Capacity visualization</h3><span class="metric-sub">' + fmt(metrics.totalCbm, 2) + " / " + fmt(metrics.container.volume, 1) + ' CBM</span></div>',
      '<div class="stacked-bar"><div class="stacked-fill ' + volumeTone + '" style="width:' + volumeFill + '%"></div></div>',
      '<div class="bar-legend"><span>Used capacity</span><span>Remaining planning space: ' + fmt(metrics.wastedSpace, 2) + " CBM</span></div>",
      "</section>"
    ].join("");
  }

  function renderPlanningNotes(metrics) {
    var tags = metrics.sanityTags.slice(0, 2).map(tagMarkup).join("");
    return [
      '<section class="planning-notes" aria-label="Planning notes">',
      '<h3>Planning notes</h3>',
      '<p>Capacity uses typical container planning values: ' + fmt(metrics.container.volume, 1) + " CBM and " + fmtInt(metrics.container.payload) + " kg payload for " + escapeHtml(metrics.container.type) + ".</p>",
      '<p>LCL candidate is flagged only when the shipment is under 13 CBM and 3,500 kg.</p>',
      tags ? '<div class="note-tags">' + tags + "</div>" : "",
      renderContributorInsights(metrics),
      "</section>"
    ].join("");
  }

  function renderResult(metrics) {
    var rootEl = document.getElementById("result-root");
    var utilizationSuppressed = metrics.visibleRules.some(function some(rule) { return rule.id === "R13"; });
    var volumeFill = Math.min(metrics.volumeUtil, 100);
    var volumeTone = metrics.volumeBand === "over" || metrics.volumeBand === "critical" ? "error" : metrics.volumeBand === "tight" ? "warning" : "";
    rootEl.innerHTML = [
      '<article class="result-card">',
      '<div class="disclaimer-strip">Planning estimate only. Confirm with your forwarder before booking. Actual container capacity depends on carton geometry, loading method, pallets, and destination weight limits.</div>',
      '<div class="result-content">',
      '<section class="verdict-block" data-verdict-block>',
      '<span class="verdict-badge ' + metrics.verdict.tone + '">' + escapeHtml(metrics.verdict.badge) + "</span>",
      "<h2>" + escapeHtml(metrics.verdict.headline) + "</h2>",
      "<p>" + escapeHtml(metrics.verdict.action) + "</p>",
      "</section>",
      renderMetricGrid(metrics, utilizationSuppressed),
      utilizationSuppressed ? '<section class="chart-card"><p class="support-note">Utilization cannot be calculated — at least one carton dimension exceeds container interior.</p></section>' : renderChart(metrics, volumeFill, volumeTone),
      renderPlanningNotes(metrics),
      '<p class="methodology">Container volumes and payload limits used in this tool are typical planning values from carrier equipment guides. They are not loading guarantees. Internal dimensions vary by carrier and container age.</p>',
      "</div>",
      "</article>"
    ].join("");

    if (window.matchMedia("(max-width: 767px)").matches) {
      document.querySelector(".result-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  var MAX_IMPORT_ROWS = 500;
  var IMPORT_FIELDS = [
    { key: "", label: "Do not import" },
    { key: "label", label: "Item / SKU label" },
    { key: "length", label: "Length" },
    { key: "width", label: "Width" },
    { key: "height", label: "Height" },
    { key: "dimensions", label: "Combined dimensions" },
    { key: "dimensionUnit", label: "Dimension unit" },
    { key: "quantity", label: "Carton quantity" },
    { key: "weight", label: "Gross weight per carton" },
    { key: "weightUnit", label: "Weight unit" },
    { key: "stackable", label: "Stackable" }
  ];
  var HEADER_SYNONYMS = {
    label: ["sku", "item", "item no", "item code", "product code", "part no", "model", "style", "品名", "型号", "货号"],
    length: ["length", "l", "len", "carton l", "ctn l", "outer l", "长", "长度", "外箱长"],
    width: ["width", "w", "wid", "carton w", "ctn w", "outer w", "宽", "宽度", "外箱宽"],
    height: ["height", "h", "ht", "carton h", "ctn h", "outer h", "depth", "高", "高度", "外箱高"],
    dimensions: ["dimensions", "dimension", "size", "carton size", "ctn size", "outer size", "lwh", "lxwxh", "l x w x h", "长宽高", "尺寸", "外箱尺寸"],
    dimensionUnit: ["dim unit", "dimension unit", "uom", "size unit", "unit dim", "尺寸单位", "单位"],
    quantity: ["cartons", "ctn", "ctns", "ctn qty", "carton qty", "no of cartons", "total cartons", "boxes", "pkgs", "packages", "箱数", "件数"],
    weight: ["gw ctn", "g w ctn", "gross wt", "gross weight", "gross weight ctn", "gross weight per ctn", "carton gw", "g w per ctn", "wt carton", "单箱毛重", "毛重"],
    weightUnit: ["wt unit", "weight unit", "uom wt", "重量单位"],
    stackable: ["stackable", "stack", "non stack", "stack ok", "y n", "可堆叠"]
  };

  function normalizeHeader(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u00a0]/g, " ")
      .replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, " ")
      .replace(/[._/\\-]+/g, " ")
      .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectUnitFromText(value, kind) {
    var text = String(value || "").toLowerCase();
    if (kind === "dimension") {
      if (/(^|[\s([（])mm($|[\s)\]）])|毫米/.test(text)) return "mm";
      if (/(^|[\s([（])cm($|[\s)\]）])|厘米|公分/.test(text)) return "cm";
      if (/(^|[\s([（])in(ch|ches)?($|[\s)\]）])|英寸/.test(text)) return "in";
      return "";
    }
    if (/(^|[\s([（])lbs?($|[\s)\]）])|磅/.test(text)) return "lb";
    if (/(^|[\s([（])kgs?($|[\s)\]）])|公斤|千克/.test(text)) return "kg";
    if (/(^|[\s([（])g($|[\s)\]）])|克/.test(text)) return "g";
    return "";
  }

  function matchHeaderToField(header) {
    var normalized = normalizeHeader(header);
    var segments = normalized.split(" ").filter(Boolean);
    var best = "";
    var bestScore = 0;
    Object.keys(HEADER_SYNONYMS).forEach(function each(field) {
      HEADER_SYNONYMS[field].forEach(function some(synonym) {
        var target = normalizeHeader(synonym);
        var segmentIndex = segments.indexOf(target);
        var score = 0;
        if (normalized === target) score = 3000 + target.length;
        else if (segmentIndex >= 0) score = 2000 + (segmentIndex * 100) + target.length;
        else if (target.length > 2 && normalized.indexOf(target) >= 0) score = target.length;
        if (score > bestScore) {
          best = field;
          bestScore = score;
        }
      });
    });
    return best;
  }

  function cellText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function rowHasContent(row) {
    return row.some(function some(cell) { return cellText(cell) !== ""; });
  }

  function fillForward(row) {
    var current = "";
    return row.map(function map(cell) {
      var text = cellText(cell);
      if (text) current = text;
      return current;
    });
  }

  function headerScore(headers) {
    var seen = {};
    headers.forEach(function each(header) {
      var field = matchHeaderToField(header);
      if (field && !seen[field]) seen[field] = true;
    });
    return Object.keys(seen).length;
  }

  function detectHeader(rawRows) {
    var rows = rawRows.filter(rowHasContent);
    if (!rows.length) return null;
    var best = { score: -1, index: 0, headers: rows[0].map(cellText), twoRow: false };
    for (var i = 0; i < Math.min(rows.length, 8); i += 1) {
      var simple = rows[i].map(cellText);
      var simpleScore = headerScore(simple);
      if (simpleScore > best.score) best = { score: simpleScore, index: i, headers: simple, twoRow: false };
      if (i + 1 < rows.length) {
        var parent = fillForward(rows[i]);
        var combined = rows[i + 1].map(function map(cell, col) {
          var child = cellText(cell);
          var head = cellText(parent[col]);
          return head && child && head !== child ? head + " " + child : child || head;
        });
        var combinedScore = headerScore(combined);
        if (combinedScore > best.score) best = { score: combinedScore, index: i + 1, headers: combined, twoRow: true };
      }
    }
    best.dataRows = rows.slice(best.index + 1);
    return best;
  }

  function detectDelimiter(text) {
    var candidates = [",", "\t", ";"];
    var firstLine = text.split(/\r?\n/).filter(function filter(line) { return line.trim(); })[0] || "";
    var best = ",";
    var bestCount = 0;
    candidates.forEach(function each(delimiter) {
      var count = parseCsvRows(firstLine, delimiter)[0].length;
      if (count > bestCount) {
        best = delimiter;
        bestCount = count;
      }
    });
    return best;
  }

  function parseCsvRows(text, delimiter) {
    var rows = [];
    var row = [];
    var cell = "";
    var inQuotes = false;
    var d = delimiter || ",";
    var input = String(text || "").replace(/^\ufeff/, "");

    for (var i = 0; i < input.length; i += 1) {
      var char = input[i];
      var next = input[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === d && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (rowHasContent(row)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell);
    if (rowHasContent(row)) rows.push(row);
    return rows;
  }

  function parseCsvText(text) {
    return parseCsvRows(text, detectDelimiter(text));
  }

  function parseNumberValue(value) {
    if (typeof value === "number") return value;
    var text = cellText(value).replace(/,/g, "");
    var match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function parseDimensions(value) {
    var text = cellText(value).replace(/[×＊]/g, "x").replace(/\*/g, "x");
    var match = text.match(/(\d+(?:\.\d+)?)\s*(?:x|\/)\s*(\d+(?:\.\d+)?)\s*(?:x|\/)\s*(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    return { length: Number(match[1]), width: Number(match[2]), height: Number(match[3]) };
  }

  function parseUnitValue(value, kind) {
    var unit = detectUnitFromText(value, kind);
    if (!unit && kind === "dimension") {
      var text = cellText(value).toLowerCase();
      if (text === "inch" || text === "inches") unit = "in";
    }
    return unit;
  }

  function parseStackable(value) {
    var text = cellText(value).toLowerCase();
    if (!text) return true;
    if (/^(n|no|false|0|non|不可|否|不能)/.test(text)) return false;
    return true;
  }

  function mapHeaders(headers, overrides) {
    var mapping = {};
    var headerUnits = {};
    headers.forEach(function each(header, index) {
      var override = overrides && Object.prototype.hasOwnProperty.call(overrides, index) ? overrides[index] : null;
      var field = override !== null ? override : matchHeaderToField(header);
      if (field && !mapping[field]) mapping[field] = index;
      var dimUnit = detectUnitFromText(header, "dimension");
      var wtUnit = detectUnitFromText(header, "weight");
      if (dimUnit && (field === "length" || field === "width" || field === "height" || field === "dimensions")) headerUnits.dimension = dimUnit;
      if (wtUnit && field === "weight") headerUnits.weight = wtUnit;
    });
    return { mapping: mapping, headerUnits: headerUnits };
  }

  function isTotalsRow(row) {
    return row.some(function some(cell) {
      var text = cellText(cell).toLowerCase();
      return text === "total" || text === "totals" || text === "合计" || text === "总计";
    });
  }

  function getCell(row, index) {
    return index === undefined ? "" : row[index];
  }

  function resolveDimensionUnit(row, mapping, headerUnits, override, warnings) {
    if (override && override !== "detected") return override;
    if (headerUnits.dimension) return headerUnits.dimension;
    var fromColumn = parseUnitValue(getCell(row, mapping.dimensionUnit), "dimension");
    if (fromColumn) return fromColumn;
    warnings.defaultDimension = true;
    return "cm";
  }

  function resolveWeightUnit(row, mapping, headerUnits, override, warnings) {
    if (override && override !== "detected") return override;
    if (headerUnits.weight) return headerUnits.weight;
    var fromColumn = parseUnitValue(getCell(row, mapping.weightUnit), "weight");
    if (fromColumn) return fromColumn;
    warnings.defaultWeight = true;
    return "kg";
  }

  function convertDimensionForLine(value, unit) {
    if (unit === "mm") return { value: round(value / 10, 2), unit: "cm" };
    return { value: value, unit: unit === "in" ? "in" : "cm" };
  }

  function convertWeightForLine(value, unit, warnings) {
    if (unit === "g") {
      warnings.grams = true;
      return { value: round(value / 1000, 3), unit: "kg" };
    }
    return { value: value, unit: unit === "lb" ? "lb" : "kg" };
  }

  function analyzeImportRows(rawRows, options) {
    var opts = options || {};
    var detected = detectHeader(rawRows || []);
    var warnings = {};
    if (!detected) {
      return { valid: false, error: "The file is empty or has no readable rows.", importedRows: [], excludedRows: [], totalsRows: 0, warnings: [] };
    }
    var mapped = mapHeaders(detected.headers, opts.mappingOverrides);
    var mapping = mapped.mapping;
    var dataRows = detected.dataRows;
    var excludedRows = [];
    var importedRows = [];
    var totalsRows = 0;

    if (!Object.keys(mapping).length) {
      return { valid: false, error: "No recognizable packing-list columns were found.", headers: detected.headers, mapping: mapping, importedRows: [], excludedRows: [], totalsRows: 0, warnings: [] };
    }
    if (!dataRows.length) {
      return { valid: false, error: "No shipment rows were found after the header row.", headers: detected.headers, mapping: mapping, importedRows: [], excludedRows: [], totalsRows: 0, warnings: [] };
    }
    if (dataRows.length > MAX_IMPORT_ROWS) {
      return { valid: false, error: "File has " + dataRows.length + " shipment rows. The v0.4 prototype cap is " + MAX_IMPORT_ROWS + " rows.", headers: detected.headers, mapping: mapping, importedRows: [], excludedRows: [], totalsRows: 0, warnings: [] };
    }

    dataRows.forEach(function each(row, rowIndex) {
      if (!rowHasContent(row)) return;
      if (isTotalsRow(row)) {
        totalsRows += 1;
        return;
      }

      var dimUnit = resolveDimensionUnit(row, mapping, mapped.headerUnits, opts.dimensionUnitOverride || "detected", warnings);
      var weightUnit = resolveWeightUnit(row, mapping, mapped.headerUnits, opts.weightUnitOverride || "detected", warnings);
      var dims = parseDimensions(getCell(row, mapping.dimensions));
      var rawLength = parseNumberValue(getCell(row, mapping.length));
      var rawWidth = parseNumberValue(getCell(row, mapping.width));
      var rawHeight = parseNumberValue(getCell(row, mapping.height));
      var length = rawLength > 0 ? rawLength : dims ? dims.length : NaN;
      var width = rawWidth > 0 ? rawWidth : dims ? dims.width : NaN;
      var height = rawHeight > 0 ? rawHeight : dims ? dims.height : NaN;
      var quantity = parseNumberValue(getCell(row, mapping.quantity));
      var weight = parseNumberValue(getCell(row, mapping.weight));
      var reasons = [];

      if (!(length > 0)) reasons.push("Missing length");
      if (!(width > 0)) reasons.push("Missing width");
      if (!(height > 0)) reasons.push("Missing height");
      if (!(quantity > 0)) reasons.push("Missing carton quantity");
      if (quantity > 0 && !Number.isInteger(quantity)) reasons.push("Carton quantity must be a whole number");
      if (!(weight > 0)) reasons.push("Missing gross weight per carton");

      if (reasons.length) {
        excludedRows.push({ rowNumber: detected.index + rowIndex + 2, reasons: reasons, sample: row.slice(0, 4).map(cellText).join(" | ") });
        return;
      }

      var convertedLength = convertDimensionForLine(length, dimUnit);
      var convertedWidth = convertDimensionForLine(width, dimUnit);
      var convertedHeight = convertDimensionForLine(height, dimUnit);
      var convertedWeight = convertWeightForLine(weight, weightUnit, warnings);
      importedRows.push({
        label: cellText(getCell(row, mapping.label)),
        length: convertedLength.value,
        width: convertedWidth.value,
        height: convertedHeight.value,
        quantity: quantity,
        weight: convertedWeight.value,
        dimensionUnit: convertedLength.unit,
        weightUnit: convertedWeight.unit,
        stackable: mapping.stackable === undefined ? true : parseStackable(getCell(row, mapping.stackable))
      });
    });

    return {
      valid: true,
      error: "",
      headers: detected.headers,
      mapping: mapping,
      headerUnits: mapped.headerUnits,
      importedRows: importedRows,
      excludedRows: excludedRows,
      totalsRows: totalsRows,
      sourceRows: dataRows.length,
      headerRowIndex: detected.index,
      twoRowHeader: detected.twoRow,
      warnings: Object.keys(warnings).filter(function filter(key) { return warnings[key]; })
    };
  }

  function mappingLabel(field) {
    var match = IMPORT_FIELDS.filter(function filter(option) { return option.key === field; })[0];
    return match ? match.label : "Do not import";
  }

  var state = {
    lines: [],
    nextLineId: 1,
    submitted: false,
    importReview: null
  };

  function createLine(data) {
    var line = data || {};
    var id = line.id || "line-" + state.nextLineId;
    state.nextLineId += 1;
    return {
      id: id,
      label: line.label || "",
      length: line.length || "",
      width: line.width || "",
      height: line.height || "",
      quantity: line.quantity || "",
      weight: line.weight || "",
      dimensionUnit: line.dimensionUnit || "cm",
      weightUnit: line.weightUnit || "kg",
      stackable: line.stackable === "no" || line.stackable === false ? false : true
    };
  }

  function getSelectedContainer() {
    return document.querySelector('input[name="containerType"]:checked').value;
  }

  function setContainer(type) {
    var input = document.querySelector('input[name="containerType"][value="' + type + '"]');
    if (input) input.checked = true;
    updateContainerCards();
    updateContainerEcho();
  }

  function setSegments(selector, activeValue, attr) {
    document.querySelectorAll(selector).forEach(function each(button) {
      button.classList.toggle("is-active", button.getAttribute(attr) === activeValue);
    });
  }

  function getStateLine(id) {
    return state.lines.filter(function filter(line) { return line.id === id; })[0];
  }

  function loadXlsxReader() {
    if (root.readXlsxFile) return Promise.resolve(root.readXlsxFile);
    return new Promise(function promise(resolve, reject) {
      var existing = document.querySelector('script[data-xlsx-reader="true"]');
      if (existing) {
        existing.addEventListener("load", function onLoad() { resolve(root.readXlsxFile); }, { once: true });
        existing.addEventListener("error", function onError() { reject(new Error("XLSX parser failed to load.")); }, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = "./vendor/read-excel-file.min.js";
      script.async = true;
      script.setAttribute("data-xlsx-reader", "true");
      script.onload = function onLoad() { resolve(root.readXlsxFile); };
      script.onerror = function onError() { reject(new Error("XLSX parser failed to load.")); };
      document.head.appendChild(script);
    });
  }

  function showImportStatus(message, tone) {
    state.importReview = {
      status: tone || "info",
      message: message,
      headers: [],
      mapping: {},
      importedRows: [],
      excludedRows: [],
      totalsRows: 0,
      warnings: [],
      sheets: []
    };
    renderImportPanel();
  }

  function buildReview(rawRows, source) {
    var previous = state.importReview || {};
    var overrides = previous.mappingOverrides || {};
    var review = analyzeImportRows(rawRows, {
      mappingOverrides: overrides,
      dimensionUnitOverride: previous.dimensionUnitOverride || "detected",
      weightUnitOverride: previous.weightUnitOverride || "detected"
    });
    review.status = review.valid ? "ready" : "error";
    review.message = review.valid ? "" : review.error;
    review.rawRows = rawRows;
    review.source = source || previous.source || {};
    review.mappingOverrides = overrides;
    review.dimensionUnitOverride = previous.dimensionUnitOverride || "detected";
    review.weightUnitOverride = previous.weightUnitOverride || "detected";
    review.sheets = previous.sheets || [];
    review.selectedSheet = previous.selectedSheet || "";
    return review;
  }

  function renderImportPanel() {
    var panel = document.querySelector("[data-import-panel]");
    if (!panel) return;
    var review = state.importReview;
    if (!review) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.hidden = false;
    if (review.status === "loading" || review.status === "success" || review.status === "info" || (review.status === "error" && !(review.sheets && review.sheets.length > 1))) {
      panel.innerHTML = '<div class="import-message ' + escapeHtml(review.status) + '">' + escapeHtml(review.message) + "</div>";
      return;
    }

    var sheetPicker = review.sheets && review.sheets.length > 1 ? [
      '<label class="field import-sheet-field"><span>XLSX tab</span><select data-sheet-select>',
      review.sheets.map(function map(sheet) {
        var selected = sheet.sheet === review.selectedSheet ? " selected" : "";
        return '<option value="' + escapeHtml(sheet.sheet) + '"' + selected + ">" + escapeHtml(sheet.sheet) + "</option>";
      }).join(""),
      "</select></label>"
    ].join("") : "";
    var rowsSummary = review.valid
      ? review.importedRows.length + " rows ready, " + review.excludedRows.length + " excluded, " + review.totalsRows + " totals rows ignored."
      : review.message;
    var warningItems = review.warnings.map(function map(key) {
      if (key === "defaultDimension") return "Dimension unit missing in file: defaulting to cm unless overridden.";
      if (key === "defaultWeight") return "Weight unit missing in file: defaulting to kg unless overridden.";
      if (key === "grams") return "Weight unit g was converted to kg; confirm the source file uses carton-level gross weight.";
      if (key === "stackableDefault") return "No stackable column was found: imported rows default to Yes.";
      return key;
    });
    if (review.valid && review.mapping && review.mapping.stackable === undefined) warningItems.push("No stackable column was found: imported rows default to Yes.");
    var mappingRows = review.headers.map(function map(header, index) {
      var field = review.mappingOverrides && Object.prototype.hasOwnProperty.call(review.mappingOverrides, index)
        ? review.mappingOverrides[index]
        : matchHeaderToField(header);
      var options = IMPORT_FIELDS.map(function option(fieldOption) {
        var selected = fieldOption.key === field ? " selected" : "";
        return '<option value="' + escapeHtml(fieldOption.key) + '"' + selected + ">" + escapeHtml(fieldOption.label) + "</option>";
      }).join("");
      return [
        '<div class="mapping-row">',
        '<span class="mapping-source">' + escapeHtml(header || "Column " + (index + 1)) + "</span>",
        '<select data-map-column="' + index + '">' + options + "</select>",
        "</div>"
      ].join("");
    }).join("");
    var excluded = review.excludedRows.length ? [
      '<details class="excluded-details"><summary>Excluded rows</summary>',
      review.excludedRows.slice(0, 12).map(function map(row) {
        return '<p>Row ' + row.rowNumber + ": " + escapeHtml(row.reasons.join(", ")) + (row.sample ? " — " + escapeHtml(row.sample) : "") + "</p>";
      }).join(""),
      review.excludedRows.length > 12 ? '<p>Only the first 12 exclusions are shown.</p>' : "",
      "</details>"
    ].join("") : "";

    panel.innerHTML = [
      '<div class="import-head"><div><p class="eyebrow">Review & Map</p><h3>' + escapeHtml(review.source && review.source.name ? review.source.name : "Packing list") + '</h3><p class="helper">' + escapeHtml(rowsSummary) + "</p></div>",
      '<button class="text-button" type="button" data-dismiss-import>Dismiss</button></div>',
      sheetPicker,
      '<div class="unit-overrides">',
      '<label class="field"><span>Dimension unit</span><select data-dimension-override><option value="detected">Detected/default</option><option value="cm">Force cm</option><option value="in">Force inch</option><option value="mm">Force mm</option></select></label>',
      '<label class="field"><span>Weight unit</span><select data-weight-override><option value="detected">Detected/default</option><option value="kg">Force kg</option><option value="lb">Force lb</option><option value="g">Force g</option></select></label>',
      "</div>",
      '<div class="mapping-list">' + mappingRows + "</div>",
      warningItems.length ? '<div class="import-message warning">' + warningItems.map(escapeHtml).join("<br>") + "</div>" : "",
      excluded,
      '<div class="import-actions"><button class="primary-button compact-primary" type="button" data-import-lines' + (review.importedRows.length ? "" : " disabled") + ">Import lines</button></div>"
    ].join("");
    var dimSelect = panel.querySelector("[data-dimension-override]");
    var wtSelect = panel.querySelector("[data-weight-override]");
    if (dimSelect) dimSelect.value = review.dimensionUnitOverride || "detected";
    if (wtSelect) wtSelect.value = review.weightUnitOverride || "detected";
    bindImportPanelEvents();
  }

  function reanalyzeCurrentImport() {
    if (!state.importReview || !state.importReview.rawRows) return;
    state.importReview = buildReview(state.importReview.rawRows, state.importReview.source);
    renderImportPanel();
  }

  function bindImportPanelEvents() {
    var panel = document.querySelector("[data-import-panel]");
    if (!panel) return;
    var dismiss = panel.querySelector("[data-dismiss-import]");
    if (dismiss) dismiss.addEventListener("click", function onClick() {
      state.importReview = null;
      renderImportPanel();
    });
    panel.querySelectorAll("[data-map-column]").forEach(function each(select) {
      select.addEventListener("change", function onChange() {
        state.importReview.mappingOverrides[Number(select.getAttribute("data-map-column"))] = select.value;
        reanalyzeCurrentImport();
      });
    });
    var dimSelect = panel.querySelector("[data-dimension-override]");
    if (dimSelect) dimSelect.addEventListener("change", function onChange() {
      state.importReview.dimensionUnitOverride = dimSelect.value;
      reanalyzeCurrentImport();
    });
    var wtSelect = panel.querySelector("[data-weight-override]");
    if (wtSelect) wtSelect.addEventListener("change", function onChange() {
      state.importReview.weightUnitOverride = wtSelect.value;
      reanalyzeCurrentImport();
    });
    var sheetSelect = panel.querySelector("[data-sheet-select]");
    if (sheetSelect) sheetSelect.addEventListener("change", function onChange() {
      var sheet = state.importReview.sheets.filter(function filter(item) { return item.sheet === sheetSelect.value; })[0];
      if (!sheet) return;
      state.importReview.selectedSheet = sheet.sheet;
      state.importReview.rawRows = sheet.data;
      reanalyzeCurrentImport();
    });
    var importButton = panel.querySelector("[data-import-lines]");
    if (importButton) importButton.addEventListener("click", importReviewedLines);
  }

  function importReviewedLines() {
    if (!state.importReview || !state.importReview.importedRows.length) return;
    state.nextLineId = 1;
    state.lines = state.importReview.importedRows.map(function map(row) { return createLine(row); });
    state.submitted = false;
    renderLines();
    clearErrors();
    state.importReview = {
      status: "success",
      message: "Imported " + state.lines.length + " editable shipment lines. Review or edit them before calculating."
    };
    renderImportPanel();
  }

  function chooseDefaultSheet(sheets) {
    return (sheets || []).filter(function filter(sheet) {
      return sheet.data && sheet.data.some(rowHasContent);
    })[0] || (sheets || [])[0];
  }

  function handleParsedRows(rawRows, source) {
    state.importReview = buildReview(rawRows, source);
    renderImportPanel();
  }

  function handleFileUpload(file) {
    if (!file) return;
    var lowerName = file.name.toLowerCase();
    if (!/\.csv$|\.xlsx$/.test(lowerName)) {
      showImportStatus("Unsupported file type. Upload a CSV or XLSX packing list.", "error");
      return;
    }
    showImportStatus("Reading " + file.name + "...", "loading");
    if (/\.csv$/.test(lowerName)) {
      file.text()
        .then(function then(text) { handleParsedRows(parseCsvText(text), { name: file.name, type: "csv" }); })
        .catch(function catchError(error) { showImportStatus(error.message || "Could not read CSV file.", "error"); });
      return;
    }
    loadXlsxReader()
      .then(function then(readXlsxFile) { return readXlsxFile(file); })
      .then(function then(sheets) {
        var sheetList = Array.isArray(sheets) ? sheets : [];
        var selected = chooseDefaultSheet(sheetList);
        if (!selected) {
          showImportStatus("The XLSX file has no readable sheets.", "error");
          return;
        }
        state.importReview = buildReview(selected.data, { name: file.name, type: "xlsx" });
        state.importReview.sheets = sheetList;
        state.importReview.selectedSheet = selected.sheet;
        renderImportPanel();
      })
      .catch(function catchError(error) { showImportStatus(error.message || "Could not parse XLSX file.", "error"); });
  }

  function lineMarkup(line, index) {
    var removeDisabled = state.lines.length <= 1 ? " disabled" : "";
    var dimCmActive = line.dimensionUnit === "cm" ? " is-active" : "";
    var dimInActive = line.dimensionUnit === "in" ? " is-active" : "";
    var weightKgActive = line.weightUnit === "kg" ? " is-active" : "";
    var weightLbActive = line.weightUnit === "lb" ? " is-active" : "";
    var stackYesActive = line.stackable ? " is-active" : "";
    var stackNoActive = line.stackable ? "" : " is-active";
    return [
      '<article class="shipment-line" data-line-id="' + escapeHtml(line.id) + '">',
      '<div class="line-header">',
      '<div class="line-title-row"><span class="line-number">Line ' + (index + 1) + '</span><div class="line-actions"><button class="text-button" type="button" data-duplicate-line="' + escapeHtml(line.id) + '">Duplicate</button><button class="text-button" type="button" data-remove-line="' + escapeHtml(line.id) + '"' + removeDisabled + ">Remove</button></div></div>",
      '<label class="field"><span>Item / SKU label</span><input type="text" value="' + escapeHtml(line.label) + '" data-line-field="label" data-error-key="' + escapeHtml(line.id) + '.label" aria-label="Line ' + (index + 1) + ' item label"></label>',
      "</div>",
      '<div class="line-settings">',
      '<div class="line-unit-row"><span>Dimension unit</span><div class="segmented" role="group" aria-label="Line ' + (index + 1) + ' dimension unit"><button type="button" class="segment' + dimCmActive + '" data-line-dim-unit="cm">cm</button><button type="button" class="segment' + dimInActive + '" data-line-dim-unit="in">inch</button></div></div>',
      '<div class="line-stack-row"><span>Stackable</span><div class="segmented" role="group" aria-label="Line ' + (index + 1) + ' stackable"><button type="button" class="segment' + stackYesActive + '" data-line-stackable="yes">Yes</button><button type="button" class="segment' + stackNoActive + '" data-line-stackable="no">No</button></div></div>',
      "</div>",
      '<div class="line-grid dimensions">',
      lineFieldMarkup(line, "length", "Length", index),
      lineFieldMarkup(line, "width", "Width", index),
      lineFieldMarkup(line, "height", "Height", index),
      "</div>",
      '<p class="helper">Outer dimensions of the carton in cm or inch.</p>',
      '<div class="line-grid quantity-weight">',
      lineFieldMarkup(line, "quantity", "Carton quantity", index, "numeric", "1"),
      '<div class="field-group weight-field-group">' + lineFieldMarkup(line, "weight", "Gross weight per carton", index) + '<div class="line-unit-row compact-unit-row"><span>Weight unit</span><div class="segmented" role="group" aria-label="Line ' + (index + 1) + ' weight unit"><button type="button" class="segment' + weightKgActive + '" data-line-weight-unit="kg">kg</button><button type="button" class="segment' + weightLbActive + '" data-line-weight-unit="lb">lb</button></div></div></div>',
      "</div>",
      '<div class="row-summary" data-row-summary="' + escapeHtml(line.id) + '"></div>',
      "</article>"
    ].join("");
  }

  function lineFieldMarkup(line, field, label, index, inputMode, step) {
    var key = line.id + "." + field;
    return [
      '<label class="field">',
      "<span>" + escapeHtml(label) + "</span>",
      '<input inputmode="' + (inputMode || "decimal") + '" type="number" step="' + (step || "any") + '" min="0" value="' + escapeHtml(line[field]) + '" data-line-field="' + escapeHtml(field) + '" data-error-key="' + escapeHtml(key) + '" aria-label="Line ' + (index + 1) + " " + escapeHtml(label) + '">',
      '<small class="error" data-error-for="' + escapeHtml(key) + '"></small>',
      "</label>"
    ].join("");
  }

  function renderLines() {
    var list = document.querySelector("[data-lines-list]");
    if (!list) return;
    list.innerHTML = state.lines.map(lineMarkup).join("");
    bindLineEvents();
    updateRowSummaries();
  }

  function collectLinesFromDom() {
    document.querySelectorAll("[data-line-id]").forEach(function each(lineEl) {
      var line = getStateLine(lineEl.getAttribute("data-line-id"));
      if (!line) return;
      lineEl.querySelectorAll("[data-line-field]").forEach(function eachField(input) {
        line[input.getAttribute("data-line-field")] = input.value;
      });
    });
    return state.lines.map(function map(line) {
      return {
        id: line.id,
        label: line.label,
        length: line.length,
        width: line.width,
        height: line.height,
        quantity: line.quantity,
        weight: line.weight,
        dimensionUnit: line.dimensionUnit,
        weightUnit: line.weightUnit,
        stackable: line.stackable ? "yes" : "no"
      };
    });
  }

  function readInputState() {
    return {
      lines: collectLinesFromDom(),
      containerType: getSelectedContainer()
    };
  }

  function convertLineDimensionUnit(lineId, nextUnit) {
    var line = getStateLine(lineId);
    if (!line || nextUnit === line.dimensionUnit) return;
    ["length", "width", "height"].forEach(function each(field) {
      var value = toNumber(line[field]);
      if (value > 0) {
        line[field] = nextUnit === "in" ? round(value / 2.54, 1) : round(value * 2.54, 1);
      }
    });
    line.dimensionUnit = nextUnit;
    renderLines();
    if (state.submitted) clearValidErrors();
  }

  function convertLineWeightUnit(lineId, nextUnit) {
    var line = getStateLine(lineId);
    if (!line || nextUnit === line.weightUnit) return;
    var value = toNumber(line.weight);
    if (value > 0) {
      line.weight = nextUnit === "lb" ? round(value * 2.20462, 1) : round(value / 2.20462, 1);
    }
    line.weightUnit = nextUnit;
    renderLines();
    if (state.submitted) clearValidErrors();
  }

  function setLineStackable(lineId, value) {
    var line = getStateLine(lineId);
    if (!line) return;
    line.stackable = value === "yes";
    renderLines();
    if (state.submitted) clearValidErrors();
  }

  function bindLineEvents() {
    document.querySelectorAll("[data-line-id]").forEach(function each(lineEl) {
      var lineId = lineEl.getAttribute("data-line-id");
      lineEl.querySelectorAll("[data-line-field]").forEach(function eachInput(input) {
        input.addEventListener("input", function onInput() {
          var line = getStateLine(lineId);
          if (line) line[input.getAttribute("data-line-field")] = input.value;
          updateRowSummaries();
          clearValidErrors();
        });
      });
      lineEl.querySelectorAll("[data-line-dim-unit]").forEach(function eachButton(button) {
        button.addEventListener("click", function onClick() { convertLineDimensionUnit(lineId, button.getAttribute("data-line-dim-unit")); });
      });
      lineEl.querySelectorAll("[data-line-weight-unit]").forEach(function eachButton(button) {
        button.addEventListener("click", function onClick() { convertLineWeightUnit(lineId, button.getAttribute("data-line-weight-unit")); });
      });
      lineEl.querySelectorAll("[data-line-stackable]").forEach(function eachButton(button) {
        button.addEventListener("click", function onClick() { setLineStackable(lineId, button.getAttribute("data-line-stackable")); });
      });
    });

    document.querySelectorAll("[data-duplicate-line]").forEach(function each(button) {
      button.addEventListener("click", function onClick() {
        duplicateLine(button.getAttribute("data-duplicate-line"));
      });
    });

    document.querySelectorAll("[data-remove-line]").forEach(function each(button) {
      button.addEventListener("click", function onClick() {
        removeLine(button.getAttribute("data-remove-line"));
      });
    });
  }

  function addLine(data) {
    collectLinesFromDom();
    state.lines.push(createLine(data));
    renderLines();
  }

  function duplicateLine(lineId) {
    collectLinesFromDom();
    var index = state.lines.findIndex(function find(line) { return line.id === lineId; });
    if (index < 0) return;
    var copy = createLine(state.lines[index]);
    copy.label = copy.label ? copy.label + " copy" : "";
    state.lines.splice(index + 1, 0, copy);
    renderLines();
  }

  function removeLine(lineId) {
    if (state.lines.length <= 1) return;
    state.lines = state.lines.filter(function filter(line) { return line.id !== lineId; });
    renderLines();
    clearValidErrors();
  }

  function clearLines() {
    state.lines = [createLine()];
    state.submitted = false;
    state.importReview = null;
    renderLines();
    renderImportPanel();
    clearErrors();
    document.getElementById("result-root").innerHTML = '<div class="empty-state" data-empty-state><p class="eyebrow">Live planning dashboard</p><h2>Enter shipment details to check fit.</h2><p>Your result will show container fit, CBM, payload risk, recommended container, and supporting calculation details.</p></div>';
  }

  function updateContainerCards() {
    var selected = getSelectedContainer();
    document.querySelectorAll(".option-card").forEach(function each(card) {
      var input = card.querySelector("input");
      card.classList.toggle("is-selected", input.value === selected);
    });
  }

  function updateContainerEcho() {
    var c = CONTAINERS[getSelectedContainer()];
    var echo = document.querySelector("[data-container-echo]");
    echo.textContent = c.type + " planning estimate: " + fmt(c.volume, 1) + " CBM, " + fmtInt(c.payload) + " kg payload, interior " + fmt(c.length, 3) + " × " + fmt(c.width, 3) + " × " + fmt(c.height, 3) + " m.";
    updateRowSummaries();
  }

  function clearErrors() {
    document.querySelectorAll(".field").forEach(function each(field) { field.classList.remove("has-error"); });
    document.querySelectorAll("[data-error-for]").forEach(function each(error) { error.textContent = ""; });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach(function each(key) {
      var field = document.querySelector('[data-error-key="' + key + '"]');
      var wrapper = field ? field.closest(".field") : null;
      var error = document.querySelector('[data-error-for="' + key + '"]');
      if (wrapper) wrapper.classList.add("has-error");
      if (error) error.textContent = errors[key];
    });
    var first = Object.keys(errors)[0];
    var firstField = first ? document.querySelector('[data-error-key="' + first + '"]') : null;
    if (firstField) firstField.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearValidErrors() {
    if (!state.submitted) return;
    var validation = validateInputs(readInputState());
    document.querySelectorAll("[data-error-for]").forEach(function each(error) {
      var key = error.getAttribute("data-error-for");
      if (!validation.errors[key]) {
        error.textContent = "";
        var field = document.querySelector('[data-error-key="' + key + '"]');
        if (field) field.closest(".field").classList.remove("has-error");
      }
    });
  }

  function rowSummaryMarkup(line, container) {
    var summary = [];
    var row = normalizeLine(line, 0);
    if (row.lengthM > 0 && row.widthM > 0 && row.heightM > 0) {
      summary.push('<span class="live-line">Carton CBM: ' + fmt(row.cartonCbm, 3) + " m³</span>");
      if (row.quantity > 0) {
        summary.push('<span class="live-line">Row total CBM: ' + fmt(row.totalCbm, 2) + " m³</span>");
      }
      if (hasRowDimensionOverflow(row, container)) {
        summary.unshift('<span class="tag-pill error">Carton too large for selected container</span>');
      }
    }
    if (row.quantity > 0 && row.weightKg > 0) {
      summary.push('<span class="live-line">Row weight: ' + fmtInt(row.totalWeightKg) + " kg</span>");
    }
    getSanityTagsForLine(row).slice(0, 2).forEach(function each(tag) {
      summary.push(tagMarkup(tag));
    });
    return summary.slice(0, 5).join("");
  }

  function updateRowSummaries() {
    if (!root.document || !document.querySelector("[data-lines-list]")) return;
    var lines = collectLinesFromDom();
    var container = CONTAINERS[getSelectedContainer()];
    lines.forEach(function each(line) {
      var target = document.querySelector('[data-row-summary="' + line.id + '"]');
      if (target) target.innerHTML = rowSummaryMarkup(line, container);
    });

    var validation = validateInputs({ lines: lines, containerType: getSelectedContainer() });
    var live = document.querySelector("[data-shipment-live]");
    if (!live) return;
    if (!validation.valid) {
      live.innerHTML = '<span class="live-line">Add at least one complete shipment line.</span>';
      return;
    }
    var metrics = calculate({ lines: lines, containerType: getSelectedContainer() });
    live.innerHTML = [
      '<span class="live-line">Total CBM: ' + fmt(metrics.totalCbm, 2) + " m³</span>",
      '<span class="live-line">Total weight: ' + fmtInt(metrics.totalWeightKg) + " kg</span>",
      '<span class="live-line">Cartons: ' + fmtInt(metrics.totalCartons) + "</span>"
    ].join("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    state.submitted = true;
    var result = calculate(readInputState());
    if (!result.valid) {
      showErrors(result.errors);
      return;
    }
    clearErrors();
    renderResult(result);
  }

  function fillExample() {
    state.nextLineId = 1;
    state.importReview = null;
    state.lines = [
      createLine({ label: "Furniture cartons", length: 90, width: 60, height: 50, quantity: 120, weight: 18, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" }),
      createLine({ label: "Accessories cartons", length: 45, width: 35, height: 30, quantity: 260, weight: 7, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" }),
      createLine({ label: "Tile cartons", length: 40, width: 40, height: 20, quantity: 400, weight: 23, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" })
    ];
    renderImportPanel();
    renderLines();
    setContainer("40GP");
    clearErrors();
  }

  function initApp() {
    if (!root.document || !document.getElementById("calculator-form")) return;

    state.lines = [createLine()];

    if (localStorage.getItem("cbm_guide_dismissed") === "true") {
      document.querySelector("[data-guide-card]").classList.add("is-hidden");
    }

    document.querySelector("[data-dismiss-guide]").addEventListener("click", function onClick() {
      localStorage.setItem("cbm_guide_dismissed", "true");
      document.querySelector("[data-guide-card]").classList.add("is-hidden");
    });

    document.querySelector("[data-example]").addEventListener("click", fillExample);
    document.querySelector("[data-add-line]").addEventListener("click", function onClick() { addLine(); });
    document.querySelector("[data-clear-lines]").addEventListener("click", clearLines);
    document.querySelector("[data-upload-trigger]").addEventListener("click", function onClick() {
      document.querySelector("[data-file-input]").click();
    });
    document.querySelector("[data-file-input]").addEventListener("change", function onChange(event) {
      handleFileUpload(event.target.files[0]);
      event.target.value = "";
    });
    var dropzone = document.querySelector("[data-upload-dropzone]");
    dropzone.addEventListener("dragover", function onDragOver(event) {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", function onDragLeave() {
      dropzone.classList.remove("is-dragging");
    });
    dropzone.addEventListener("drop", function onDrop(event) {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      handleFileUpload(event.dataTransfer.files[0]);
    });

    document.querySelectorAll('input[name="containerType"]').forEach(function each(input) {
      input.addEventListener("change", function onChange() {
        updateContainerCards();
        updateContainerEcho();
      });
    });

    document.getElementById("calculator-form").addEventListener("submit", handleSubmit);
    renderLines();
    renderImportPanel();
    updateContainerEcho();
  }

  var api = {
    CONTAINERS: CONTAINERS,
    RULE_MESSAGES: RULE_MESSAGES,
    RULE_PRIORITY: RULE_PRIORITY,
    validateInputs: validateInputs,
    calculate: calculate,
    normalizeInput: normalizeInput,
    fitsContainer: fitsContainer,
    smallestContainer: smallestContainer,
    parseCsvText: parseCsvText,
    analyzeImportRows: analyzeImportRows,
    mapHeaders: mapHeaders,
    parseDimensions: parseDimensions,
    fmt: fmt,
    fmtInt: fmtInt
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.CBMTool = api;

  if (root.document) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initApp);
    } else {
      initApp();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
