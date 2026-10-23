const { ESTIMATE: ESTIMATE_RAW, LOCATION_MAP, WHOLE_BUILDING_BUDGET } = require("./estimate-data");

// The Concrete Log's Level list has no "P1a", so P1a is treated as part of P1
// everywhere: its estimate is added onto P1 here, and any P1a / P1A pour in the
// log is counted as P1 (see canonLevel below). Steps and Toppings are folded into
// Suspended slab (flatwork), and Stairs & landings, Housekeeping pads and Pedestals are added to the
// level's slab volume. estimate-data.js itself is untouched.
const ESTIMATE = (() => {
  const merged = JSON.parse(JSON.stringify(ESTIMATE_RAW));
  if (merged["P1a"]) {
    merged["P1"] = merged["P1"] || {};
    for (const [cat, v] of Object.entries(merged["P1a"])) {
      merged["P1"][cat] = Math.round(((merged["P1"][cat] || 0) + v) * 10) / 10;
    }
    delete merged["P1a"];
  }
  // Flatwork on a suspended level is logged as one thing (Suspended Slab). The takeoff's Steps and
  // Toppings columns are flatwork poured with the slab, so they are added into the Suspended slab
  // estimate for each level (e.g. Level 1: 573.4 slab + 178.5 steps = 751.9). Slabs on grade stay
  // separate because the log has its own Slab On Grade location.
  for (const cats of Object.values(merged)) {
    const fold = (cats["Steps"] || 0) + (cats["Toppings"] || 0);
    if (fold) cats["Suspended slab"] = Math.round(((cats["Suspended slab"] || 0) + fold) * 10) / 10;
    cats["Steps"] = 0;
    cats["Toppings"] = 0;
  }
  // Stairs & landings, Housekeeping pads and Pedestals have no Concrete Log location of their own,
  // so their volume is added to the level's slab volume: Suspended slab, or Slabs on grade on a
  // level with no suspended slab (P2). Upstands & curbs stay separate (the log has a location for them).
  for (const cats of Object.values(merged)) {
    const extra = (cats["Stairs & landings"] || 0) + (cats["Housekeeping pads"] || 0) + (cats["Pedestals"] || 0);
    if (extra) {
      const target = (cats["Suspended slab"] || 0) > 0 ? "Suspended slab" : "Slabs on grade";
      cats[target] = Math.round(((cats[target] || 0) + extra) * 10) / 10;
    }
    cats["Stairs & landings"] = 0;
    cats["Housekeeping pads"] = 0;
    cats["Pedestals"] = 0;
  }
  return merged;
})();
const { PRECON_GROUPS, TRM_TO_GROUP, LOCATION_TO_GROUPS } = require("./precon-crosswalk");

// Location decides the bucket; mix refines within it; LPM always flags.
function resolveGroup(location, mixCode) {
  const mixGroup = mixCode ? TRM_TO_GROUP[mixCode] : null;
  if (mixGroup === "lpm_flag") return "lpm_flag";
  const allowed = LOCATION_TO_GROUPS[location];
  if (!allowed) return mixGroup || "unmapped_mix";
  if (mixGroup && allowed.includes(mixGroup)) return mixGroup;
  return allowed[0];
}

// The Concrete Log records levels as "L1".."L29", "P1".."P4" and "Roof", but
// ESTIMATE (from the takeoff) is keyed "1".."29", "P2", "P1" (with P1a folded in), "Roof".
// Normalise the log's code to the estimate's key before looking it up.
function canonLevel(level) {
  const s = String(level).trim();
  let m;
  if ((m = /^L\s*(\d+)$/i.exec(s))) return "L" + parseInt(m[1], 10);
  if ((m = /^P\s*(\d+)a?$/i.exec(s))) return "P" + m[1];   // "P1a" / "P1A" are counted as P1
  if (/^roof$/i.test(s)) return "Roof";
  return s;
}
function levelKey(level) {
  const c = canonLevel(level);
  const m = /^L(\d+)$/.exec(c);
  return m ? m[1] : c;
}
// Estimate key back to the log's level code ("1" -> "L1"), and building order.
function keyToCode(k) { return /^\d+$/.test(k) ? "L" + k : k; }
const BUILDING_ORDER = ["P5", "P4", "P3", "P2", "P1"]
  .concat(Array.from({ length: 35 }, (_, i) => "L" + (i + 1)), ["Roof"]);
// Levels that exist in the takeoff but carry no concrete: a pour here really is
// unbudgeted ("no estimate"), as opposed to a level the estimate doesn't cover.
const ZERO_ESTIMATE_LEVELS = new Set(["P5", "P4", "P3"]);

const SHEET_ID = "1726632799719300"; // 665 - 701 Kingsway - Concrete Log

// Column titles we need, matched by title rather than index since Smartsheet
// column order can shift if someone edits the sheet.
const WANTED_COLUMNS = [
  "Completed by Site Team",
  "PO", "PO#", "Delivery Date", "Notes",
  "Unit Price ($/m3)", "Volume (m3)", "Level", "Location Used", "Mix #1 Ordered", "Mix #1 Concrete Price",
  "(Mix #2) Unit Price ($/m3)", "(Mix #2) Volume (m3)", "(Mix #2) Level", "(Mix #2) Location Used", "(Mix #2) Ordered", "Mix #2 Concrete Price",
  "(Mix #3) Unit Price ($/m3)", "(Mix #3) Volume (m3)", "(Mix #3) Level", "(Mix #3) Location Used", "(Mix #3) Ordered", "Mix #3 Concrete Price",
  "M#1-Add #1", "M#1-Add #1 Unit Price", "M#1-Add #2", "M#1-Add #2 Unit Price", "M#1-Add #3", "M#1-Add #3 Unit Price", "M#1-Add #4", "M#1-Add #4 Unit Price",
  "M#2-Add #1", "M#2-Add #1 Unit Price", "M#2-Add #2", "M#2-Add #2 Unit Price",
  "M#3-Add #1", "M#3-Add #1 Unit Price",
  "Total Price", "Admixtures Price"
];

exports.handler = async function (event) {
  const token = process.env.SMARTSHEET_API_TOKEN;
  if (!token) {
    return respond(500, { error: "SMARTSHEET_API_TOKEN is not configured on this Netlify site." });
  }

  try {
    const sheetRes = await fetch(`https://api.smartsheet.com/2.0/sheets/${SHEET_ID}?include=rowPermalink&level=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!sheetRes.ok) {
      const text = await sheetRes.text();
      return respond(sheetRes.status, { error: "Smartsheet API error", detail: text });
    }
    const sheet = await sheetRes.json();

    const colIdByTitle = {};
    for (const col of sheet.columns) colIdByTitle[col.title] = col.id;

    const cellByColId = (row) => {
      const map = {};
      for (const cell of row.cells) map[cell.columnId] = cell.value;
      return map;
    };

    // Flatten every row's Mix #1 / #2 / #3 into individual pours
    const pours = [];
    // Pours on rows NOT yet marked "Completed by Site Team". They never count
    // toward actuals - only reported separately as "logged, not yet complete".
    const pendingPours = [];
    for (const row of sheet.rows) {
      const cells = cellByColId(row);
      // Only pours confirmed by the site team count as actuals - unchecked rows
      // are future/tentative pours that may still change (kept as pending).
      const completed = cells[colIdByTitle["Completed by Site Team"]] === true;
      const mixes = [
        ["Unit Price ($/m3)", "Volume (m3)", "Level", "Location Used", "Mix #1 Concrete Price", "Mix #1 Ordered", ["M#1-Add #1 Unit Price", "M#1-Add #2 Unit Price", "M#1-Add #3 Unit Price", "M#1-Add #4 Unit Price"]],
        ["(Mix #2) Unit Price ($/m3)", "(Mix #2) Volume (m3)", "(Mix #2) Level", "(Mix #2) Location Used", "Mix #2 Concrete Price", "(Mix #2) Ordered", ["M#2-Add #1 Unit Price", "M#2-Add #2 Unit Price", "M#2-Add #3 Unit Price", "M#2-Add #4 Unit Price"]],
        ["(Mix #3) Unit Price ($/m3)", "(Mix #3) Volume (m3)", "(Mix #3) Level", "(Mix #3) Location Used", "Mix #3 Concrete Price", "(Mix #3) Ordered", ["M#3-Add #1 Unit Price", "M#3-Add #2 Unit Price", "M#3-Add #3 Unit Price", "M#3-Add #4 Unit Price"]]
      ];
      for (const [rateKey, volKey, lvlKey, locKey, priceKey, orderedKey, addKeys] of mixes) {
        const vol = num(cells[colIdByTitle[volKey]]);
        const level = cells[colIdByTitle[lvlKey]];
        const location = cells[colIdByTitle[locKey]];
        if (!vol || !level || !location) continue;
        const orderedText = cells[colIdByTitle[orderedKey]];
        // Picklist values look like "TRM935242 - 35MPA - INT. COLUMN..." -
        // the TRM code is the first token.
        const mixCode = orderedText ? String(orderedText).trim().split(/[\s-]/)[0] : null;
        // Admixture charges logged against this mix slot (superplasticizer,
        // PRA, delayset, winter handling, etc.)
        const additives = addKeys.reduce((s, k) => s + num(cells[colIdByTitle[k]]), 0);
        (completed ? pours : pendingPours).push({
          volume: vol,
          level: canonLevel(level),
          location: String(location),
          rate: num(cells[colIdByTitle[rateKey]]),
          price: num(cells[colIdByTitle[priceKey]]),
          additives,
          mixCode
        });
      }
    }

    // Aggregate by level + mapped category
    const agg = {};
    for (const p of pours) {
      const category = LOCATION_MAP[p.location] || "Unmapped - review";
      const key = p.level + "||" + category;
      if (!agg[key]) agg[key] = { level: p.level, category, actualVolume: 0, actualCost: 0, mixes: {} };
      agg[key].actualVolume += p.volume;
      agg[key].actualCost += (p.price || p.volume * p.rate) + p.additives;
      if (p.mixCode) agg[key].mixes[p.mixCode] = true;
    }

    // Pending (not yet completed) volume and cost by level + category. A combo
    // with only pending pours still gets a row, flagged pendingOnly so it stays
    // out of the totals and the on-track / near / over counts.
    const pendAgg = {};
    for (const p of pendingPours) {
      const category = LOCATION_MAP[p.location] || "Unmapped - review";
      const key = p.level + "||" + category;
      if (!pendAgg[key]) pendAgg[key] = { level: p.level, category, volume: 0, cost: 0 };
      pendAgg[key].volume += p.volume;
      pendAgg[key].cost += (p.price || p.volume * p.rate) + p.additives;
    }
    for (const [key, pa] of Object.entries(pendAgg)) {
      if (!agg[key]) agg[key] = { level: pa.level, category: pa.category, actualVolume: 0, actualCost: 0, mixes: {}, pendingOnly: true };
    }

    // Blended actual $/m3 rate per category, pooled across all levels -
    // used as the proxy budget rate since no precon $ budget exists yet.
    const rateByCategory = {};
    for (const r of Object.values(agg)) {
      if (!rateByCategory[r.category]) rateByCategory[r.category] = { vol: 0, cost: 0 };
      rateByCategory[r.category].vol += r.actualVolume;
      rateByCategory[r.category].cost += r.actualCost;
    }

    const rows = Object.values(agg).map((r) => {
      const lvlEst = ESTIMATE[levelKey(r.level)];
      const estimateMapped = !!lvlEst || ZERO_ESTIMATE_LEVELS.has(levelKey(r.level));
      const estVol = (lvlEst && lvlEst[r.category]) || 0;
      const rateInfo = rateByCategory[r.category];
      const rate = rateInfo && rateInfo.vol > 0 ? rateInfo.cost / rateInfo.vol : 0;
      const estCost = r.category === "Unmapped - review" ? 0 : estVol * rate;
      return {
        level: r.level,
        category: r.category,
        estimateMapped,
        pendingOnly: !!r.pendingOnly,
        pendingVolume: round((pendAgg[r.level + "||" + r.category] || {}).volume || 0),
        pendingCost: round((pendAgg[r.level + "||" + r.category] || {}).cost || 0),
        estimateVolume: round(estVol),
        actualVolume: round(r.actualVolume),
        estimateCost: round(estCost),
        actualCost: round(r.actualCost),
        pctUsed: (estVol > 0 && !r.pendingOnly) ? Math.round((r.actualVolume / estVol) * 1000) / 10 : null,
        mixesUsed: Object.keys(r.mixes).sort()
      };
    }).sort((a, b) => (b.pctUsed ?? -1) - (a.pctUsed ?? -1));

    // ---- Per-level summary for the Level completion panel ----
    // Estimate side comes from the whole takeoff (so budgeted categories that were
    // never poured show as under); actual side is completed pours only.
    const rateFor = (cat) => {
      const ri = rateByCategory[cat];
      return ri && ri.vol > 0 ? ri.cost / ri.vol : 0;
    };
    const levelMap = {};
    const levelEntry = (code) => levelMap[code] || (levelMap[code] = {
      level: code, estimateMapped: !!ESTIMATE[levelKey(code)] || ZERO_ESTIMATE_LEVELS.has(levelKey(code)),
      cats: {}, pendingVolume: 0
    });
    const catEntry = (e, cat) => e.cats[cat] || (e.cats[cat] = { category: cat, estimateVolume: 0, actualVolume: 0, actualCost: 0 });
    for (const [k, cats] of Object.entries(ESTIMATE)) {
      const e = levelEntry(keyToCode(k));
      for (const [cat, v] of Object.entries(cats)) if (v > 0) catEntry(e, cat).estimateVolume = v;
    }
    for (const a of Object.values(agg)) {
      if (a.pendingOnly) continue;
      const c = catEntry(levelEntry(a.level), a.category);
      c.actualVolume += a.actualVolume;
      c.actualCost += a.actualCost;
    }
    for (const pa of Object.values(pendAgg)) levelEntry(pa.level).pendingVolume += pa.volume;
    const levels = Object.values(levelMap).map((e) => {
      const cats = Object.values(e.cats).map((c) => ({
        category: c.category,
        estimateVolume: round(c.estimateVolume),
        actualVolume: round(c.actualVolume),
        actualCost: round(c.actualCost),
        estimateCost: c.category === "Unmapped - review" ? 0 : round(c.estimateVolume * rateFor(c.category))
      })).sort((x, y) => Math.max(y.estimateVolume, y.actualVolume) - Math.max(x.estimateVolume, x.actualVolume));
      return {
        level: e.level,
        estimateMapped: e.estimateMapped,
        estimateVolume: round(cats.reduce((t, c) => t + c.estimateVolume, 0)),
        actualVolume: round(cats.reduce((t, c) => t + c.actualVolume, 0)),
        estimateCost: round(cats.reduce((t, c) => t + c.estimateCost, 0)),
        actualCost: round(cats.reduce((t, c) => t + c.actualCost, 0)),
        pendingVolume: round(e.pendingVolume),
        categories: cats
      };
    }).filter(l => l.estimateVolume > 0 || l.actualVolume > 0 || l.pendingVolume > 0)
      .sort((a, b) => {
        const ia = BUILDING_ORDER.indexOf(a.level), ib = BUILDING_ORDER.indexOf(b.level);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });

    const wholeBuildingEstimate = Object.values(ESTIMATE).reduce(
      (sum, cats) => sum + Object.values(cats).reduce((s, v) => s + v, 0), 0
    );
    const wholeBuildingActual = pours.reduce((s, p) => s + p.volume, 0);
    const wholeBuildingActualCost = pours.reduce((s, p) => s + (p.price || p.volume * p.rate) + p.additives, 0);
    const wholeBuildingEstimateCost = WHOLE_BUILDING_BUDGET;
    const countedRows = rows.filter(r => !r.pendingOnly);
    const activeRows = countedRows.filter(r => r.category !== "Unmapped - review");

    // ---- Mix-level comparison: actual pours grouped by precon mix line ----
    const mixAgg = {};
    for (const p of pours) {
      const groupKey = resolveGroup(p.location, p.mixCode);
      if (!mixAgg[groupKey]) mixAgg[groupKey] = { vol: 0, cost: 0, mixes: {} };
      mixAgg[groupKey].vol += p.volume;
      mixAgg[groupKey].cost += (p.price || p.volume * p.rate) + p.additives;
      if (p.mixCode) mixAgg[groupKey].mixes[p.mixCode] = true;
    }
    const mixComparison = Object.entries(mixAgg).map(([key, agg2]) => {
      const g = PRECON_GROUPS[key] || { label: "Unrecognized mix code - review", preconLines: "none", volume: 0, flag: "review" };
      return {
        groupKey: key,
        group: g.label,
        preconLines: g.preconLines,
        preconVolume: round(g.volume),
        actualVolume: round(agg2.vol),
        actualCost: round(agg2.cost),
        mixesUsed: Object.keys(agg2.mixes).sort(),
        pctUsed: g.volume > 0 ? Math.round((agg2.vol / g.volume) * 1000) / 10 : null,
        flag: g.flag || null
      };
    }).sort((a, b) => {
      if (!!a.flag !== !!b.flag) return a.flag ? -1 : 1;
      return (b.pctUsed ?? -1) - (a.pctUsed ?? -1);
    });

    // Build full PO list for the pour map using column index (sparse rows
    // only return cells that have values; index is more reliable than title lookup)
    const poColIdx    = 2;  // "PO" (SYS_UNIQUEID)
    const poNumColIdx = 3;  // "PO#" (formula)
    const dateColIdx  = 5;  // "Delivery Date"
    const completedIdx= 1;  // "Completed by Site Team"
    const notesColIdx = 41; // "Notes"
    const totalColIdx = 40; // "Total Price"
    const admixColIdx = 39; // "Admixtures Price"

    // Build a columnId -> columnIndex map for index-based lookup
    const colIndexById = {};
    for (const col of sheet.columns) colIndexById[col.id] = col.index;

    const pos = sheet.rows.map(row => {
      // Build index-keyed cell map
      const byIdx = {};
      for (const cell of row.cells) {
        const idx = colIndexById[cell.columnId];
        if (idx !== undefined) byIdx[idx] = cell.value;
      }
      const po = byIdx[poColIdx] || byIdx[poNumColIdx] || null;
      if (!po) return null;
      return {
        po: String(po),
        date: byIdx[dateColIdx] ? String(byIdx[dateColIdx]) : null,
        completed: byIdx[completedIdx] === true,
        totalCost: num(byIdx[totalColIdx]),
        admixtureCost: num(byIdx[admixColIdx]),
        notes: byIdx[notesColIdx] ? String(byIdx[notesColIdx]) : null,
        mixes: [] // populated below with full data already in pours array
      };
    }).filter(Boolean);

    // Attach mix data to each PO directly from the raw row, keyed by row
    const rowByPo = {};
    for (const row of sheet.rows) {
      const byIdx = {};
      for (const cell of row.cells) {
        const idx = colIndexById[cell.columnId];
        if (idx !== undefined) byIdx[idx] = cell.value;
      }
      const po = byIdx[poColIdx] || byIdx[poNumColIdx];
      if (po) rowByPo[String(po)] = byIdx;
    }

    pos.forEach(po => {
      const byIdx = rowByPo[po.po] || {};
      const mixes = [];
      [
        // [orderedIdx, rateIdx, volIdx, lvlIdx, locIdx, priceIdx]
        [11, 12, 13, 14, 15, 18],
        [20, 21, 22, 23, 24, 27],
        [29, 30, 31, 32, 33, 36],
      ].forEach(([ordIdx, rateIdx, volIdx, lvlIdx, locIdx, priceIdx], i) => {
        const ordered = byIdx[ordIdx];
        const vol = num(byIdx[volIdx]);
        const level = byIdx[lvlIdx];
        const location = byIdx[locIdx];
        if (!ordered && !vol) return;
        const mixCode = ordered ? String(ordered).trim().split(/[\s-]/)[0] : null;
        mixes.push({
          mixNum: i + 1,
          mixCode,
          mixOrdered: ordered ? String(ordered) : null,
          rate: num(byIdx[rateIdx]),
          volume: vol,
          level: level ? String(level) : null,
          location: location ? String(location) : null,
          concreteCost: num(byIdx[priceIdx]),
        });
      });
      po.mixes = mixes;
    });

    return respond(200, {
      updatedAt: new Date().toISOString(),
      rows,
      levels,
      mixComparison,
      pos,
      pours: pours.map(p => ({
        level: p.level,
        location: p.location,
        category: LOCATION_MAP[p.location] || "Unmapped - review",
        volume: round(p.volume),
        cost: round((p.price || p.volume * p.rate) + p.additives),
        mix: p.mixCode,
        group: resolveGroup(p.location, p.mixCode),
      })),
      totals: {
        activeEstimate: round(countedRows.reduce((s, r) => s + r.estimateVolume, 0)),
        activeActual: round(activeRows.reduce((s, r) => s + r.actualVolume, 0)),
        activeEstimateCost: round(activeRows.reduce((s, r) => s + r.estimateCost, 0)),
        activeActualCost: round(countedRows.reduce((s, r) => s + r.actualCost, 0)),
        pendingVolume: round(pendingPours.reduce((s, p) => s + p.volume, 0)),
        pendingCost: round(pendingPours.reduce((s, p) => s + (p.price || p.volume * p.rate) + p.additives, 0)),
        wholeBuildingEstimate: round(wholeBuildingEstimate),
        wholeBuildingActual: round(wholeBuildingActual),
        wholeBuildingEstimateCost: round(wholeBuildingEstimateCost),
        wholeBuildingActualCost: round(wholeBuildingActualCost)
      }
    });
  } catch (err) {
    return respond(500, { error: "Sync failed", detail: String(err) });
  }
};

function num(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
function round(n) {
  return Math.round(n * 100) / 100;
}
function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body)
  };
}
