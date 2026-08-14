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
  col_int_55:           { label: "Columns Interior 55MPa",                     preconLines: "#10",       volume: 7.1 },
  col_int_60:           { label: "Columns Interior 60MPa",                     preconLines: "#11",       volume: 1.8 },
  col_int_65:           { label: "Columns Interior 65MPa",                     preconLines: "#12",       volume: 12.7 },
  col_ext_35:           { label: "Columns Exterior 35MPa",                     preconLines: "#13",       volume: 0 },
  col_ext_50:           { label: "Columns Exterior 50MPa",                     preconLines: "#14",       volume: 7.4 },
  col_ext_parking_55:   { label: "Columns/Shear Walls 55MPa (Ext & Parking)",  preconLines: "#15 + #18", volume: 35.5 },
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
//   Exterior; dominant use is balcony/exterior slab pours.
// - TRM935242 (35MPa Int Column/Shearwalls/PT & Transfer) -> combined
//   Columns Interior 35MPa + Transfer Slab & Beam group.
// - TRM935244 (C1 parking multi-use) forces #5 + #20 + #26 into one group.
// - TRM955242 (55MPa Ext & Parking) forces #15 + #18 into one group.
// - Ext topping (TRM932144) counted under Toppings even though precon line
//   is titled "Interior" (precon volume is 0 either way).
// Location Used (Smartsheet) -> allowed precon groups. LOCATION IS THE
// DECIDING FACTOR for where volume is allotted (per Eric, Aug 2026): the
// first entry is the default for that location; the mix code only refines
// WITHIN the allowed list (e.g. picking which column-strength line), never
// overrides the location. Example: 450 m3 of TRM925242 (SOG mix) tagged
// "Footings" counts against Footings.
exports.LOCATION_TO_GROUPS = {
  "Footings": ["footings"],
  "Footings - Crane Pad": ["footings"],
  "Slab On Grade (Interior Parkade)": ["sog_otherwall_int"],
  "Slab On Grade (Exterior)": ["not_in_precon"],
  "Walls (Blind Formed / Shotcrete Only)": ["shotcrete"],
  "Walls (Excluding Blind Formed / Shotcrete)": ["sog_otherwall_int", "col_shear_int_50", "col_shear_parking_50", "col_ext_parking_55", "col_parking_65", "col_int_65", "ext_walls", "parking_c1"],
  "Columns": ["col_int_35_transfer", "col_int_45", "col_shear_int_50", "col_int_55", "col_int_60", "col_int_65", "col_ext_35", "col_ext_50", "col_ext_parking_55", "col_ext_65", "col_parking_65", "col_shear_parking_50", "parking_c1"],
  "Suspended Slab (Parking)": ["parking_c1"],
  "Suspended Slab (No Exposure - WP Over)": ["rebar_slabs_int", "rebar_slabs_ext", "col_int_35_transfer"],
  "Concrete Topping (Interior)": ["toppings"],
  "Concrete Topping (Exterior - non structural)": ["toppings"],
  "Curbs/Stairs/Planter Walls (Exterior)": ["ext_walls"],
  "Blinding - Footing Excavation protection": ["leanmix"],
  "Other - Void Fill, Soil Stabilization, etc.": ["not_in_precon"]
};

exports.TRM_TO_GROUP = {
  TRM210120: "leanmix",
  TRM25541: "not_in_precon",
  TRM600122: "rebar_slabs_int",
  TRM600124: "parking_c1",
  TRM600222: "rebar_slabs_int",
  TRM600224: "parking_c1",
  TRM735144: "shotcrete",
  TRM820551: "not_in_precon",
  TRM835242: "parking_c1",
  TRM845234: "col_int_45",
  TRM850152: "col_shear_int_50",
  TRM850252: "col_shear_int_50",
  TRM850253: "col_shear_int_50",
  TRM855152: "col_int_55",
  TRM855153: "col_ext_parking_55",
  TRM855252: "col_int_55",
  TRM855253: "col_ext_parking_55",
  TRM860152: "col_int_60",
  TRM860252: "col_int_60",
  TRM865147: "col_int_65",
  TRM865242: "col_parking_65",
  TRM865252: "col_int_65",
  TRM920142: "toppings",
  TRM925142: "toppings",
  TRM925222: "sog_otherwall_int",
  TRM925242: "sog_otherwall_int",
  TRM925243: "ext_walls",
  TRM925442: "footings",
  TRM930242: "rebar_slabs_int",
  TRM930243: "rebar_slabs_ext",
  TRM932142LP: "lpm_flag",
  TRM932143LP: "lpm_flag",
  TRM932144: "toppings",
  TRM932244: "not_in_precon",
  TRM935142LP: "lpm_flag",
  TRM935144LP: "lpm_flag",
  TRM935242: "col_int_35_transfer",
  TRM935243: "ext_walls",
  TRM935244: "parking_c1",
  TRM935443: "footings",
  TRM945142LP: "lpm_flag",
  TRM945144LP: "lpm_flag",
  TRM950142: "col_shear_parking_50",
  TRM950143: "col_ext_50",
  TRM950242: "col_shear_parking_50",
  TRM955142: "col_ext_parking_55",
  TRM955242: "col_ext_parking_55",
  TRM965147: "col_parking_65"
};
