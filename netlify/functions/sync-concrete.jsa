const { ESTIMATE, LOCATION_MAP } = require("./estimate-data");

const SHEET_ID = "1726632799719300"; // 665 - 701 Kingsway - Concrete Log

// Column titles we need, matched by title rather than index since Smartsheet
// column order can shift if someone edits the sheet.
const WANTED_COLUMNS = [
  "Unit Price ($/m3)", "Volume (m3)", "Level", "Location Used", "Mix #1 Concrete Price",
  "(Mix #2) Unit Price ($/m3)", "(Mix #2) Volume (m3)", "(Mix #2) Level", "(Mix #2) Location Used", "Mix #2 Concrete Price",
  "(Mix #3) Unit Price ($/m3)", "(Mix #3) Volume (m3)", "(Mix #3) Level", "(Mix #3) Location Used", "Mix #3 Concrete Price"
];

exports.handler = async function (event) {
  const token = process.env.SMARTSHEET_API_TOKEN;
  if (!token) {
    return respond(500, { error: "SMARTSHEET_API_TOKEN is not configured on this Netlify site." });
  }

  try {
    const sheetRes = await fetch(`https://api.smartsheet.com/2.0/sheets/${SHEET_ID}`, {
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
      const mixes = [
        ["Unit Price ($/m3)", "Volume (m3)", "Level", "Location Used", "Mix #1 Concrete Price"],
        ["(Mix #2) Unit Price ($/m3)", "(Mix #2) Volume (m3)", "(Mix #2) Level", "(Mix #2) Location Used", "Mix #2 Concrete Price"],
        ["(Mix #3) Unit Price ($/m3)", "(Mix #3) Volume (m3)", "(Mix #3) Level", "(Mix #3) Location Used", "Mix #3 Concrete Price"]
      ];
      for (const [rateKey, volKey, lvlKey, locKey, priceKey] of mixes) {
        const vol = num(cells[colIdByTitle[volKey]]);
        const level = cells[colIdByTitle[lvlKey]];
        const location = cells[colIdByTitle[locKey]];
        if (!vol || !level || !location) continue;
        pours.push({
          volume: vol,
          level: String(level),
          location: String(location),
          rate: num(cells[colIdByTitle[rateKey]]),
          price: num(cells[colIdByTitle[priceKey]])
        });
      }
    }

    // Aggregate by level + mapped category
    const agg = {};
    for (const p of pours) {
      const category = LOCATION_MAP[p.location] || "Unmapped - review";
      const key = p.level + "||" + category;
      if (!agg[key]) agg[key] = { level: p.level, category, actualVolume: 0, actualCost: 0 };
      agg[key].actualVolume += p.volume;
      agg[key].actualCost += p.price || p.volume * p.rate;
    }

    const rows = Object.values(agg).map((r) => {
      const estVol = (ESTIMATE[r.level] && ESTIMATE[r.level][r.category]) || 0;
      return {
        level: r.level,
        category: r.category,
        estimateVolume: round(estVol),
        actualVolume: round(r.actualVolume),
        actualCost: round(r.actualCost),
        pctUsed: estVol > 0 ? Math.round((r.actualVolume / estVol) * 1000) / 10 : null
      };
    }).sort((a, b) => (b.pctUsed ?? -1) - (a.pctUsed ?? -1));

    const wholeBuildingEstimate = Object.values(ESTIMATE).reduce(
      (sum, cats) => sum + Object.values(cats).reduce((s, v) => s + v, 0), 0
    );
    const wholeBuildingActual = pours.reduce((s, p) => s + p.volume, 0);

    return respond(200, {
      updatedAt: new Date().toISOString(),
      rows,
      totals: {
        activeEstimate: round(rows.reduce((s, r) => s + r.estimateVolume, 0)),
        activeActual: round(rows.filter(r => r.category !== "Blinding (not estimated)").reduce((s, r) => s + r.actualVolume, 0)),
        wholeBuildingEstimate: round(wholeBuildingEstimate),
        wholeBuildingActual: round(wholeBuildingActual)
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
