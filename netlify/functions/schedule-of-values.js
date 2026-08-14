// Schedule of Values - 701 Kingsway concrete mixes (project 03-30-150).
// Source: contracted rate schedule provided by Eric, Aug 2026.
// Rates are $/m3 and DO NOT include PST & GST.
//
// This is reference data only - it is not currently wired into any cost
// calculation on the dashboard. The per-category "proxy rate" used in
// sync-concrete.js is still the blended actual $/m3 from the Concrete Log.
// To use real contract rates instead, each dashboard category (Footings,
// Walls, Columns, Slabs on grade, Suspended slab, etc.) would need to be
// mapped to the specific mix number(s) that apply to it - several mixes
// often cover one category (e.g. parking vs non-parking, different %
// reinforcement), so that mapping should be confirmed before wiring it in.

exports.SCHEDULE_OF_VALUES = [
  { no: 1,  mixNumber: "TRM210120",   mpa: 10, description: "Blind Mix", rate: 195.00 },
  { no: 2,  mixNumber: "TRM25541",    mpa: 25, description: "Masonry Fill (Blockfill)", rate: 315.00 },
  { no: 3,  mixNumber: "TRM600122",   mpa: 35, description: "Rebar Interior Slab 14mm 20MPA/36HR Non Parking - HE@48HR (14mm 1-4%)", rate: 240.00 },
  { no: 4,  mixNumber: "TRM600124",   mpa: 35, description: "Parking Slab 14mm 20MPA/36HR - Fastrak 20/24 (Not for steel trowel)", rate: 235.00 },
  { no: 5,  mixNumber: "TRM600222",   mpa: 35, description: "Rebar Interior Slab 20MPA/36Hr Non Parking - HE@48HR (20mm 1-4%)", rate: 235.00 },
  { no: 6,  mixNumber: "TRM600224",   mpa: 35, description: "Parking Slab 20MPA/36HR - HE (20mm 5-8%) (Not for steel trowel)", rate: 242.00 },
  { no: 7,  mixNumber: "TRM735144",   mpa: 35, description: "Shotcrete (Conshot 35)", rate: 304.00 },
  { no: 8,  mixNumber: "TRM820551",   mpa: 20, description: "Masonry Grout @ 56 Day", rate: 293.00 },
  { no: 9,  mixNumber: "TRM835242",   mpa: 35, description: "Parking Slab - Enviromix", rate: 207.00 },
  { no: 10, mixNumber: "TRM845234",   mpa: 45, description: "Column Puddling - C1 Enviromix", rate: 233.00 },
  { no: 11, mixNumber: "TRM850152",   mpa: 50, description: "Interior Column & Shearwalls @ 56 Days (14mm 56 Day)", rate: 256.00 },
  { no: 12, mixNumber: "TRM850252",   mpa: 50, description: "Interior Column & Shearwalls @ 56 Days (20mm 1-4%)", rate: 256.00 },
  { no: 13, mixNumber: "TRM850253",   mpa: 50, description: "Interior Column @ 56 Days (20mm 4-7%)", rate: 266.00 },
  { no: 14, mixNumber: "TRM855152",   mpa: 55, description: "Interior Column @ 56 Days (14mm 56 Day 1-4%)", rate: 276.00 },
  { no: 15, mixNumber: "TRM855153",   mpa: 55, description: "Exterior Column @ 56 Days (14mm 4-7%)", rate: 278.00 },
  { no: 16, mixNumber: "TRM855252",   mpa: 55, description: "Interior Column @ 56 Days (20mm 1-4%)", rate: 268.00 },
  { no: 17, mixNumber: "TRM855253",   mpa: 55, description: "Exterior Column @ 56 Days (20mm 4-7%)", rate: 274.00 },
  { no: 18, mixNumber: "TRM860152",   mpa: 60, description: "Interior Column @ 56 Days (14mm 56 Day 1-4%)", rate: 286.00 },
  { no: 19, mixNumber: "TRM860252",   mpa: 60, description: "Interior Column @ 56 Days (20mm 1-4%)", rate: 278.00 },
  { no: 20, mixNumber: "TRM865147",   mpa: 65, description: "Interior Column @ 56 Days (14mm 56 Day)", rate: 289.00 },
  { no: 21, mixNumber: "TRM865242",   mpa: 65, description: "Int. Parking Shear Wall & Columns @ 56 Days (20mm 1-4%)", rate: 350.00 },
  { no: 22, mixNumber: "TRM865252",   mpa: 65, description: "Interior Column @ 56 Days (20mm 1-4% 56 Day)", rate: 288.00 },
  { no: 23, mixNumber: "TRM920142",   mpa: 20, description: "Int. Topping Non Structural (14mm)", rate: 196.00 },
  { no: 24, mixNumber: "TRM925142",   mpa: 20, description: "Topping for Steel Deck (14mm)", rate: 198.00 },
  { no: 25, mixNumber: "TRM925222",   mpa: 25, description: "Parking Slab on Grade (Fastrak)", rate: 201.00 },
  { no: 26, mixNumber: "TRM925242",   mpa: 25, description: "Interior SOG & Other Walls", rate: 188.00 },
  { no: 27, mixNumber: "TRM925243",   mpa: 25, description: "Ext. Basement Walls & Other Walls (F2)", rate: 189.00 },
  { no: 28, mixNumber: "TRM925442",   mpa: 25, description: "Footing & Footings for Shearwalls (38mm Agg)", rate: 191.00 },
  { no: 29, mixNumber: "TRM930242",   mpa: 30, description: "Interior Rebar Slabs", rate: 196.00 },
  { no: 30, mixNumber: "TRM930243",   mpa: 30, description: "Ext. Columns, Slab & Balconies w/ Membrane (F2/C3 20mm)", rate: 206.00 },
  { no: 31, mixNumber: "TRM932142LP", mpa: 32, description: "LPM Interior - Wall & Topping Non Structural (14mm 1-4%)", rate: 220.00 },
  { no: 32, mixNumber: "TRM932143LP", mpa: 32, description: "LPM Exterior - Walls (14mm 4-7%)", rate: 224.00 },
  { no: 33, mixNumber: "TRM932144",   mpa: 32, description: "Ext. Topping Non Structural (14mm)", rate: 220.00 },
  { no: 34, mixNumber: "TRM932244",   mpa: 32, description: "Exterior SOG, Sidewalk & Drives (C-2 Exposure)", rate: 210.00 },
  { no: 35, mixNumber: "TRM935142LP", mpa: 35, description: "LPM Interior - Rebar Slab, Column, Transfer Slab & Beams (14mm 1-4%)", rate: 233.00 },
  { no: 36, mixNumber: "TRM935144LP", mpa: 35, description: "LPM Exterior - Rebar Slabs (14mm 5-8%)", rate: 238.00 },
  { no: 37, mixNumber: "TRM935242",   mpa: 35, description: "Int. Column, Shearwalls/PT & Transfer Slab & Beams", rate: 203.00 },
  { no: 38, mixNumber: "TRM935243",   mpa: 35, description: "Exterior Shearwalls (F2)", rate: 210.00 },
  { no: 39, mixNumber: "TRM935244",   mpa: 35, description: "Parking Slab, Ramp, Column, Shearwall, Other Wall (C1, Not steel trowel)", rate: 218.00 },
  { no: 40, mixNumber: "TRM935443",   mpa: 35, description: "Exterior Footing at Grade (38mm F2)", rate: 212.00 },
  { no: 41, mixNumber: "TRM945142LP", mpa: 45, description: "Rebar Interior Slab 20MPA/72hrs Non Parking - Line Pump (14mm 1-4%)", rate: 260.00 },
  { no: 42, mixNumber: "TRM945144LP", mpa: 45, description: "Parking Slab 20MPA/72hrs - Line Pump (14mm 5-8%) (Not for steel trowel)", rate: 265.00 },
  { no: 43, mixNumber: "TRM950142",   mpa: 50, description: "Parking Shear Wall Columns (14mm)", rate: 262.00 },
  { no: 44, mixNumber: "TRM950143",   mpa: 50, description: "Exterior Column Non Parking @ 56 Days (14mm F2)", rate: 266.00 },
  { no: 45, mixNumber: "TRM950242",   mpa: 50, description: "Parking Column @ 56 Days", rate: 256.00 },
  { no: 46, mixNumber: "TRM955142",   mpa: 55, description: "Parking Shear Wall Columns (14mm 56 Day)", rate: 266.00 },
  { no: 47, mixNumber: "TRM955242",   mpa: 55, description: "Exterior & Parking Columns & Shearwalls @ 56 Days", rate: 268.00 },
  { no: 48, mixNumber: "TRM965147",   mpa: 65, description: "Parking Shear Wall Columns (14mm 1-4%)", rate: 327.00 }
];
