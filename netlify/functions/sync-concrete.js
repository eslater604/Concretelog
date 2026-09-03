const { ESTIMATE, LOCATION_MAP, WHOLE_BUILDING_BUDGET } = require("./estimate-data");
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
    for (const row of sheet.rows) {
      const cells = cellByColId(row);
      // Only count pours confirmed by the site team - unchecked rows are
      // future/tentative pours that may still change.
      if (cells[colIdByTitle["Completed by Site Team"]] !== true) continue;
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
        pours.push({
          volume: vol,
          level: String(level),
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

    // Blended actual $/m3 rate per category, pooled across all levels -
    // used as the proxy budget rate since no precon $ budget exists yet.
    const rateByCategory = {};
    for (const r of Object.values(agg)) {
      if (!rateByCategory[r.category]) rateByCategory[r.category] = { vol: 0, cost: 0 };
      rateByCategory[r.category].vol += r.actualVolume;
      rateByCategory[r.category].cost += r.actualCost;
    }

    const rows = Object.values(agg).map((r) => {
      const estVol = (ESTIMATE[r.level] && ESTIMATE[r.level][r.category]) || 0;
      const rateInfo = rateByCategory[r.category];
      const rate = rateInfo && rateInfo.vol > 0 ? rateInfo.cost / rateInfo.vol : 0;
      const estCost = r.category === "Unmapped - review" ? 0 : estVol * rate;
      return {
        level: r.level,
        category: r.category,
        estimateVolume: round(estVol),
        actualVolume: round(r.actualVolume),
        estimateCost: round(estCost),
        actualCost: round(r.actualCost),
        pctUsed: estVol > 0 ? Math.round((r.actualVolume / estVol) * 1000) / 10 : null,
        mixesUsed: Object.keys(r.mixes).sort()
      };
    }).sort((a, b) => (b.pctUsed ?? -1) - (a.pctUsed ?? -1));

    const wholeBuildingEstimate = Object.values(ESTIMATE).reduce(
      (sum, cats) => sum + Object.values(cats).reduce((s, v) => s + v, 0), 0
    );
    const wholeBuildingActual = pours.reduce((s, p) => s + p.volume, 0);
    const wholeBuildingActualCost = pours.reduce((s, p) => s + (p.price || p.volume * p.rate) + p.additives, 0);
    const wholeBuildingEstimateCost = WHOLE_BUILDING_BUDGET;
    const activeRows = rows.filter(r => r.category !== "Unmapped - review");

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

    // Attach full mix data to each PO from the already-processed pours array
    pos.forEach(po => {
      po.mixes = pours
        .filter(p => {
          const rowPo = sheet.rows.find(r => {
            const byIdx = {};
            for (const cell of r.cells) { const idx = colIndexById[cell.columnId]; if (idx !== undefined) byIdx[idx] = cell.value; }
            return String(byIdx[poColIdx] || byIdx[poNumColIdx] || '') === po.po;
          });
          return !!rowPo;
        })
        .map(p => ({
          mixCode: p.mixCode,
          mixOrdered: null,
          rate: p.rate,
          volume: p.volume,
          level: p.level,
          location: p.location,
          concreteCost: p.price || p.volume * p.rate,
          admixtures: []
        }));
    });

    return respond(200, {
      updatedAt: new Date().toISOString(),
      rows,
      mixComparison,
      pos,
      pours: pours.map(p => ({
        level: p.level,
        location: p.location,
        category: LOCATION_MAP[p.location] || "Unmapped - review",
        volume: round(p.volume),
        cost: round((p.price || p.volume * p.rate) + p.additives),
        mix: p.mixCode,
      })),
      totals: {
        activeEstimate: round(rows.reduce((s, r) => s + r.estimateVolume, 0)),
        activeActual: round(activeRows.reduce((s, r) => s + r.actualVolume, 0)),
        activeEstimateCost: round(activeRows.reduce((s, r) => s + r.estimateCost, 0)),
        activeActualCost: round(rows.reduce((s, r) => s + r.actualCost, 0)),
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
