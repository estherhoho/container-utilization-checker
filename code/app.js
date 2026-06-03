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
    R1: "Shipment is small for FCL. LCL is often cheaper — ask your forwarder.",
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

  function validateInputs(input) {
    var errors = {};
    var length = toNumber(input.length);
    var width = toNumber(input.width);
    var height = toNumber(input.height);
    var quantity = toNumber(input.quantity);
    var weight = toNumber(input.weight);

    if (!(length > 0)) errors.length = "Length must be > 0.";
    if (!(width > 0)) errors.width = "Width must be > 0.";
    if (!(height > 0)) errors.height = "Height must be > 0.";
    if (!(quantity > 0)) errors.quantity = "Quantity must be > 0.";
    if (quantity > 0 && !Number.isInteger(quantity)) errors.quantity = "Quantity must be a whole number.";
    if (!(weight > 0)) errors.weight = "Gross weight must be > 0.";

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  function normalizeInput(input) {
    var dimUnit = input.dimensionUnit || "cm";
    var weightUnit = input.weightUnit || "kg";
    var length = toNumber(input.length);
    var width = toNumber(input.width);
    var height = toNumber(input.height);
    var quantity = toNumber(input.quantity);
    var weight = toNumber(input.weight);

    return {
      original: {
        length: length,
        width: width,
        height: height,
        quantity: quantity,
        weight: weight,
        dimensionUnit: dimUnit,
        weightUnit: weightUnit,
        containerType: input.containerType || "40GP",
        stackable: input.stackable !== "no" && input.stackable !== false
      },
      lengthM: dimensionToMeters(length, dimUnit),
      widthM: dimensionToMeters(width, dimUnit),
      heightM: dimensionToMeters(height, dimUnit),
      quantity: quantity,
      weightKg: weightToKg(weight, weightUnit),
      containerType: input.containerType || "40GP",
      stackable: input.stackable !== "no" && input.stackable !== false
    };
  }

  function hasDimensionOverflow(normalized, container) {
    return normalized.lengthM > container.length || normalized.widthM > container.width || normalized.heightM > container.height;
  }

  function fitsContainer(normalized, type, targetVolume) {
    var container = CONTAINERS[type];
    var cartonCbm = normalized.lengthM * normalized.widthM * normalized.heightM;
    var totalCbm = cartonCbm * normalized.quantity;
    var totalWeightKg = normalized.weightKg * normalized.quantity;
    var maxVolume = targetVolume ? container.volume * targetVolume : container.volume;
    return !hasDimensionOverflow(normalized, container) && totalCbm <= maxVolume && totalWeightKg <= container.payload;
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

  function getSanityTags(normalized) {
    var validDims = normalized.lengthM > 0 && normalized.widthM > 0 && normalized.heightM > 0;
    if (!validDims || !(normalized.weightKg > 0)) return [];

    var cartonCbm = normalized.lengthM * normalized.widthM * normalized.heightM;
    var longestCm = Math.max(normalized.lengthM, normalized.widthM, normalized.heightM) * 100;
    var density = normalized.weightKg / cartonCbm;
    var tags = [];

    if (longestCm >= 40 && longestCm <= 70 && cartonCbm >= 0.04 && cartonCbm <= 0.1) {
      tags.push({ text: "✓ Standard FBA carton", tone: "success" });
    } else if (longestCm > 100 || cartonCbm > 0.4) {
      tags.push({ text: "Large carton", tone: "warning" });
    } else if (longestCm < 30 && cartonCbm < 0.02) {
      tags.push({ text: "Compact carton", tone: "info" });
    }

    if (density < 100) {
      tags.push({ text: "Light cargo (low density)", tone: "info" });
    } else if (density <= 500) {
      tags.push({ text: "Medium density", tone: "success" });
    } else {
      tags.push({ text: "Dense / heavy cargo — payload may bind", tone: "error" });
    }

    return tags;
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
        headline: "Carton too large for " + selected + ".",
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
        badge: "Small Shipment",
        tone: "warning",
        headline: "Small shipment for FCL.",
        action: "Small shipment — LCL likely cheaper."
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

    if (recStrict && recStrict !== selected) {
      var recStrictUtil = (metrics.totalCbm / CONTAINERS[recStrict].volume) * 100;
      var utilizationWord = recStrictUtil >= 60 && recStrictUtil <= 85 ? "healthy" : "lower";
      return {
        badge: "Fits",
        tone: "warning",
        headline: selected + " is over-spec.",
        action: selected + " is over-spec. " + recStrict + " fits at " + utilizationWord + " " + fmt(recStrictUtil, 0) + "% utilization."
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
      return { valid: false, errors: validation.errors };
    }

    var normalized = normalizeInput(input);
    var container = CONTAINERS[normalized.containerType];
    var cartonCbm = normalized.lengthM * normalized.widthM * normalized.heightM;
    var totalCbm = cartonCbm * normalized.quantity;
    var totalWeightKg = normalized.weightKg * normalized.quantity;
    var volumeUtil = (totalCbm / container.volume) * 100;
    var payloadUtil = (totalWeightKg / container.payload) * 100;
    var dimensionOverflow = hasDimensionOverflow(normalized, container);
    var recommendedContainer = smallestContainer(normalized, null);
    var targetRecommendedContainer = smallestContainer(normalized, 0.85);
    var wastedSpace = Math.max(container.volume - totalCbm, 0);
    var metrics = {
      valid: true,
      normalized: normalized,
      container: container,
      cartonCbm: cartonCbm,
      totalCbm: totalCbm,
      totalWeightKg: totalWeightKg,
      volumeUtil: volumeUtil,
      payloadUtil: payloadUtil,
      volumeBand: getBand(volumeUtil),
      payloadBand: getBand(payloadUtil),
      dimensionOverflow: dimensionOverflow,
      recommendedContainer: recommendedContainer,
      targetRecommendedContainer: targetRecommendedContainer,
      wastedSpace: wastedSpace,
      sanityTags: getSanityTags(normalized)
    };

    metrics.rules = evaluateRules(metrics);
    metrics.visibleRules = metrics.rules.some(function some(rule) { return rule.id === "R13"; })
      ? metrics.rules.filter(function filter(rule) { return rule.id === "R13"; })
      : metrics.rules;
    metrics.verdict = buildVerdict(metrics);
    return metrics;
  }

  function readInputState() {
    return {
      length: getField("length").value,
      width: getField("width").value,
      height: getField("height").value,
      quantity: getField("quantity").value,
      weight: getField("weight").value,
      dimensionUnit: state.dimensionUnit,
      weightUnit: state.weightUnit,
      containerType: getSelectedContainer(),
      stackable: state.stackable ? "yes" : "no"
    };
  }

  function getField(name) {
    return document.querySelector('[data-field="' + name + '"]');
  }

  function setField(name, value) {
    getField(name).value = value;
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

  function convertDimensionUnit(nextUnit) {
    if (nextUnit === state.dimensionUnit) return;
    ["length", "width", "height"].forEach(function each(field) {
      var input = getField(field);
      var value = toNumber(input.value);
      if (value > 0) {
        input.value = nextUnit === "in" ? round(value / 2.54, 1) : round(value * 2.54, 1);
      }
    });
    state.dimensionUnit = nextUnit;
    setSegments("[data-dim-unit]", nextUnit, "data-dim-unit");
    updateLiveHints();
    if (state.submitted) clearValidErrors();
  }

  function convertWeightUnit(nextUnit) {
    if (nextUnit === state.weightUnit) return;
    var input = getField("weight");
    var value = toNumber(input.value);
    if (value > 0) {
      input.value = nextUnit === "lb" ? round(value * 2.20462, 1) : round(value / 2.20462, 1);
    }
    state.weightUnit = nextUnit;
    setSegments("[data-weight-unit]", nextUnit, "data-weight-unit");
    updateLiveHints();
    if (state.submitted) clearValidErrors();
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
    updateLiveHints();
  }

  function clearErrors() {
    document.querySelectorAll(".field").forEach(function each(field) { field.classList.remove("has-error"); });
    document.querySelectorAll("[data-error-for]").forEach(function each(error) { error.textContent = ""; });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach(function each(key) {
      var field = getField(key);
      var wrapper = field ? field.closest(".field") : null;
      var error = document.querySelector('[data-error-for="' + key + '"]');
      if (wrapper) wrapper.classList.add("has-error");
      if (error) error.textContent = errors[key];
    });
    var first = Object.keys(errors)[0];
    if (first && getField(first)) getField(first).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearValidErrors() {
    if (!state.submitted) return;
    var validation = validateInputs(readInputState());
    document.querySelectorAll("[data-error-for]").forEach(function each(error) {
      var key = error.getAttribute("data-error-for");
      if (!validation.errors[key]) {
        error.textContent = "";
        var field = getField(key);
        if (field) field.closest(".field").classList.remove("has-error");
      }
    });
  }

  function tagMarkup(tag) {
    return '<span class="tag-pill ' + tag.tone + '">' + escapeHtml(tag.text) + "</span>";
  }

  function updateLiveHints() {
    if (!root.document) return;
    var input = readInputState();
    var normalized = normalizeInput(input);
    var dimLines = [];
    var weightLines = [];
    var tags = getSanityTags(normalized);
    var validation = validateInputs(input);
    var c = CONTAINERS[input.containerType];

    if (normalized.lengthM > 0 && normalized.widthM > 0 && normalized.heightM > 0) {
      var cartonCbm = normalized.lengthM * normalized.widthM * normalized.heightM;
      dimLines.push('<span class="live-line">Carton CBM: ' + fmt(cartonCbm, 3) + " m³</span>");
      if (normalized.quantity > 0) {
        dimLines.push('<span class="live-line">Total shipment CBM: ' + fmt(cartonCbm * normalized.quantity, 2) + " m³</span>");
      }
      if (hasDimensionOverflow(normalized, c)) {
        dimLines.unshift('<span class="tag-pill error">Carton too large for selected container</span>');
      }
    }

    if (normalized.quantity > 0 && normalized.weightKg > 0) {
      weightLines.push('<span class="live-line">Total shipment weight: ' + fmtInt(normalized.quantity * normalized.weightKg) + " kg</span>");
    }

    if (validation.valid || (normalized.lengthM > 0 && normalized.widthM > 0 && normalized.heightM > 0 && normalized.weightKg > 0)) {
      tags.slice(0, 3).forEach(function each(tag) {
        dimLines.push(tagMarkup(tag));
      });
    }

    document.querySelector("[data-live-dimensions]").innerHTML = dimLines.slice(0, 5).join("");
    document.querySelector("[data-live-weight]").innerHTML = weightLines.slice(0, 2).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function renderResult(metrics) {
    var rootEl = document.getElementById("result-root");
    var utilizationSuppressed = metrics.visibleRules.some(function some(rule) { return rule.id === "R13"; });
    var detailsOpen = window.matchMedia("(min-width: 768px)").matches ? " open" : "";
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
      utilizationSuppressed ? '<section class="chart-card"><p class="support-note">Utilization cannot be calculated — carton dimension exceeds container interior.</p></section>' : renderChart(metrics, volumeFill, volumeTone),
      '<details class="supporting-details"' + detailsOpen + '><summary>Show calculation details</summary>' + renderDetails(metrics) + "</details>",
      '<p class="methodology">Container volumes and payload limits used in this tool are typical planning values from carrier equipment guides. They are not loading guarantees. Internal dimensions vary by carrier and container age.</p>',
      "</div>",
      "</article>"
    ].join("");

    if (window.matchMedia("(max-width: 767px)").matches) {
      document.querySelector(".result-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderMetricGrid(metrics, utilizationSuppressed) {
    var fitStatus = metrics.verdict.badge;
    var rec = metrics.targetRecommendedContainer || metrics.recommendedContainer || "Split shipment";
    var tags = metrics.sanityTags.slice(0, 2).map(tagMarkup).join("");
    return [
      '<section class="metric-grid" aria-label="Container result metrics">',
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Container Fit</p><span class="metric-icon">C</span></div><div class="metric-value">' + escapeHtml(fitStatus) + '</div><div class="metric-sub">Best plan</div><div class="metric-rec">' + escapeHtml(rec) + "</div></div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Volume Utilization</p><span class="metric-icon">V</span></div>' + (utilizationSuppressed ? '<div class="metric-value">Blocked</div><div class="metric-sub">Dimension overflow</div>' : meterSvg(metrics.volumeUtil, metrics.volumeBand, "Volume utilization") + '<div class="metric-value">' + fmt(metrics.volumeUtil, 1) + '%</div><div class="metric-sub">' + escapeHtml(metrics.volumeBand) + "</div>") + tags + "</div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">Payload Utilization</p><span class="metric-icon">W</span></div>' + meterSvg(metrics.payloadUtil, metrics.payloadBand, "Payload utilization") + '<div class="metric-value">' + fmt(metrics.payloadUtil, 1) + '%</div><div class="metric-sub">' + fmtInt(metrics.totalWeightKg) + " kg / " + fmtInt(metrics.container.payload) + " kg</div></div>",
      '<div class="metric-card"><div class="metric-head"><p class="metric-label">CBM Summary</p><span class="metric-icon">B</span></div><div class="summary-stack"><div><span>Carton CBM</span><strong>' + fmt(metrics.cartonCbm, 3) + ' m³</strong></div><div><span>Total CBM</span><strong>' + fmt(metrics.totalCbm, 2) + ' m³</strong></div><div><span>Wasted space</span><strong>' + fmt(metrics.wastedSpace, 2) + ' m³</strong></div></div></div>',
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

  function renderDetails(metrics) {
    var n = metrics.normalized;
    return [
      '<div class="detail-grid">',
      '<div class="detail-row"><span>Canonical dimensions</span><strong>' + fmt(n.lengthM, 3) + " × " + fmt(n.widthM, 3) + " × " + fmt(n.heightM, 3) + " m</strong></div>",
      '<div class="detail-row"><span>Original input unit</span><strong>' + escapeHtml(n.original.dimensionUnit) + " / " + escapeHtml(n.original.weightUnit) + "</strong></div>",
      '<div class="detail-row"><span>Total CBM</span><strong>' + fmt(metrics.totalCbm, 2) + " m³</strong></div>",
      '<div class="detail-row"><span>Total gross weight</span><strong>' + fmtInt(metrics.totalWeightKg) + " kg</strong></div>",
      '<div class="detail-row"><span>Selected container max</span><strong>' + fmt(metrics.container.volume, 1) + " CBM / " + fmtInt(metrics.container.payload) + " kg</strong></div>",
      '<div class="detail-row"><span>Container interior</span><strong>' + fmt(metrics.container.length, 3) + " × " + fmt(metrics.container.width, 3) + " × " + fmt(metrics.container.height, 3) + " m</strong></div>",
      "</div>"
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
    state.dimensionUnit = "cm";
    state.weightUnit = "kg";
    state.stackable = true;
    setSegments("[data-dim-unit]", "cm", "data-dim-unit");
    setSegments("[data-weight-unit]", "kg", "data-weight-unit");
    setSegments("[data-stackable]", "yes", "data-stackable");
    setField("length", 60);
    setField("width", 40);
    setField("height", 30);
    setField("quantity", 500);
    setField("weight", 12);
    setContainer("40GP");
    clearErrors();
    updateLiveHints();
  }

  var state = {
    dimensionUnit: "cm",
    weightUnit: "kg",
    stackable: true,
    submitted: false
  };

  function initApp() {
    if (!root.document || !document.getElementById("calculator-form")) return;

    if (localStorage.getItem("cbm_guide_dismissed") === "true") {
      document.querySelector("[data-guide-card]").classList.add("is-hidden");
    }

    document.querySelector("[data-dismiss-guide]").addEventListener("click", function onClick() {
      localStorage.setItem("cbm_guide_dismissed", "true");
      document.querySelector("[data-guide-card]").classList.add("is-hidden");
    });

    document.querySelector("[data-example]").addEventListener("click", fillExample);

    document.querySelectorAll("[data-dim-unit]").forEach(function each(button) {
      button.addEventListener("click", function onClick() { convertDimensionUnit(button.getAttribute("data-dim-unit")); });
    });

    document.querySelectorAll("[data-weight-unit]").forEach(function each(button) {
      button.addEventListener("click", function onClick() { convertWeightUnit(button.getAttribute("data-weight-unit")); });
    });

    document.querySelectorAll("[data-stackable]").forEach(function each(button) {
      button.addEventListener("click", function onClick() {
        state.stackable = button.getAttribute("data-stackable") === "yes";
        setSegments("[data-stackable]", button.getAttribute("data-stackable"), "data-stackable");
        updateLiveHints();
      });
    });

    document.querySelectorAll('input[name="containerType"]').forEach(function each(input) {
      input.addEventListener("change", function onChange() {
        updateContainerCards();
        updateContainerEcho();
      });
    });

    ["length", "width", "height", "quantity", "weight"].forEach(function each(field) {
      getField(field).addEventListener("input", function onInput() {
        updateLiveHints();
        clearValidErrors();
      });
    });

    document.getElementById("calculator-form").addEventListener("submit", handleSubmit);
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
