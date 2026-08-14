// Crosswalk: Schedule of Values TRM mixes -> precon takeoff mix lines.
// Where one TRM mix serves multiple precon lines, those precon lines are
// COMBINED into one group (per Eric, Aug 2026) so there is no ambiguity.
// Precon volumes come from CSP_TOTAL in "701 Kingsway - Concrete Take Off -
// by level.xlsx" (TOTAL column). Group volumes sum to 8,890.7 m3 = the full
// precon takeoff, verified.
//
// LPM / line-pump mixes are NOT expected to be used on this job. They get a
// dedicated zero-budget group so ANY volume logged against them is flagged.

exports.PRECON_GROUPS = {
  footings:             { label: "Footings",                                   preconLines: "#2",        volume: 847.5 },
  sog_otherwall_int:    { label: "SOG Interior + Other Walls Interior",        preconLines: "#1 + #24",  volume: 455.6 },
  rebar_slabs_int:      { label: "Rebar Slabs Interior",                       preconLines: "#3",        volume: 3524.6 },
  rebar_slabs_ext:      { label: "Rebar Slabs Exterior",                       preconLines: "#4",        volume: 143.3 },
  parking_c1:           { label: "Parking slabs, ramps, columns & walls (C1)", preconLines: "#5 + #20 + #26", volume: 640.2 },
  toppings:             { label: "Toppings (non-structural)",                  preconLines: "#6",        volume: 0 },
  col_int_35_transfer:  { label: "Columns Interior 35MPa + Transfer Slab & Beam", preconLines: "#7 + #27", volume: 1053.9 },
  col_int_45:           { label: "Columns Interior 45MPa",                     preconLines: "#8",        volume: 0 },
  col_shear_int_50:     { label: "Columns & Shear Walls Interior 50MPa",       preconLines: "#9 + #21",  volume: 1402.1 },
  col_int_55:           { label: "Columns/Shear Walls 55MPa (Int, Ext & Parking)", preconLines: "#10 + #15 + #18", volume: 42.6 },
  col_int_60:           { label: "Columns Interior 60MPa",                     preconLines: "#11",       volume: 1.8 },
  col_int_65:           { label: "Columns Interior 65MPa",                     preconLines: "#12",       volume: 12.7 },
  col_ext_35:           { label: "Columns Exterior 35MPa",                     preconLines: "#13",       volume: 0 },
  col_ext_50:           { label: "Columns Exterior 50MPa",                     preconLines: "#14",       volume: 7.4 },
  col_ext_65:           { label: "Columns Exterior 65MPa",                     preconLines: "#16",       volume: 0 },
  col_parking_65:       { label: "Columns/Shear Walls in Parking 65MPa",       preconLines: "#17",       volume: 0 },
  col_shear_parking_50: { label: "Columns & Shear Walls in Parking 50MPa",     preconLines: "#19 + #22", volume: 198.0 },
  ext_walls:            { label: "Exterior Basement & Other Walls",            preconLines: "#23 + #25", volume: 48.1 },
  leanmix:              { label: "Leanmix / Blinding",                         preconLines: "#28",       volume: 112.0 },
  shotcrete:            { label: "Shotcrete",                                  preconLines: "#29",       volume: 400.9 },
  lpm_flag:             { label: "LPM / line-pump mixes - NOT EXPECTED",       preconLines: "none",      volume: 0, flag: "lpm" },
  not_in_precon:        { label: "Not in precon takeoff (masonry, ext SOG)",   preconLines: "none",      volume: 0, flag: "review" }
};

// Assumption notes (review with precon if these ever matter):
// - TRM845234 (Column Puddling 45MPa C1) -> Columns Interior 45MPa.
// - TRM930243 (Ext Columns, Slab & Balconies w/ Membrane) -> Rebar Slabs
//   Exterior; dominant
