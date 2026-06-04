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

  var state = {
    lines: [],
    nextLineId: 1,
    submitted: false
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
    renderLines();
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
    state.lines = [
      createLine({ label: "Furniture cartons", length: 90, width: 60, height: 50, quantity: 120, weight: 18, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" }),
      createLine({ label: "Accessories cartons", length: 45, width: 35, height: 30, quantity: 260, weight: 7, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" }),
      createLine({ label: "Tile cartons", length: 40, width: 40, height: 20, quantity: 400, weight: 23, dimensionUnit: "cm", weightUnit: "kg", stackable: "yes" })
    ];
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

    document.querySelectorAll('input[name="containerType"]').forEach(function each(input) {
      input.addEventListener("change", function onChange() {
        updateContainerCards();
        updateContainerEcho();
      });
    });

    document.getElementById("calculator-form").addEventListener("submit", handleSubmit);
    renderLines();
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
