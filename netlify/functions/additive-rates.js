// RMC Ready-Mix Ltd. - Additional Charges & Fees Schedule
// Source: Rate schedule provided by Eric, Aug 2026.
// All prices in CAD. Do NOT include PST & GST.
//
// This is reference data used to validate admixture costs pulled from the
// Concrete Log. The log captures per-PO admixture prices directly, so this
// schedule is for cross-checking and for flagging any unexpected rates.

exports.PREMIUM_ADDITIONS = [
  { item: "Decorative Colour Concrete", description: "Chromatech Classic",   unit: "per metre",  price: 110.00 },
  { item: "Decorative Colour Concrete", description: "Chromatech Plus",      unit: "per metre",  price: 130.00 },
  { item: "Decorative Colour Concrete", description: "Chromatech Pro",       unit: "per metre",  price: 150.00 },
  { item: "Decorative Colour Concrete", description: "Chromatech Premium",   unit: "per metre",  price: null, note: "Contact Salesman" },
];

exports.ADDITIONAL_CHARGES = [
  { item: "Fuel Surcharge",                    unit: "per load",        price: 50.00  },
  { item: "Environmental Levy",                unit: "per m3",          price: 14.00  },
  { item: "Winter Handling (Nov 1 - Mar 31)",  unit: "per m3",          price: 20.00  },
  { item: "Fibermesh Reinforcing",             unit: "per m3",          price: 40.00  },
  { item: "Non-Chloride Accelerator (NCA)",    unit: "per litre",       price: 9.00   },
  { item: "Superplasticizer",                  unit: "per dose",        price: 8.00   },
  { item: "PRA (Watertight Admixture 2%)",     unit: "per metre",       price: 95.00  },
  { item: "Delayset",                          unit: "per litre",       price: 13.00  },
  { item: "Coloured Washout Charge",           unit: "each",            price: 100.00 },
  { item: "Customer Added Products",           unit: "per m3",          price: 20.00  },
  { item: "Returned Concrete Disposal Charge", unit: "per load 3-6 m3", price: 175.00 },
  { item: "Returned Concrete Disposal Charge", unit: "per load 6-10 m3",price: 325.00 },
  { item: "Overtime Charges (outside hrs)",    unit: "per hour",        price: 200.00 },
  { item: "Minimum Load (0-1.9 m3)",           unit: "per order",       price: 260.00 },
  { item: "Minimum Load (2-2.9 m3)",           unit: "per order",       price: 210.00 },
  { item: "Minimum Load (3-3.9 m3)",           unit: "per order",       price: 185.00 },
  { item: "Minimum Load (4-4.9 m3)",           unit: "per order",       price: 165.00 },
  { item: "Minimum Load (5-5.9 m3)",           unit: "per order",       price: 145.00 },
  { item: "Unload Time",                       unit: "per hour",        price: 200.00, note: "Excess time rate. Prices based on max allowance of 8 mins per metre of unloading time on original job site." },
  { item: "Cancellation Charge",               unit: "per m3",          price: 55.00,  note: "Applies to cancellation of confirmed orders." },
  { item: "Saturday Premium Charge",           unit: "per m3",          price: 20.00  },
];

// Lookup by admixture name as it appears in the Smartsheet picklist.
// Used to cross-check unit prices logged in M#1-Add / M#2-Add / M#3-Add columns.
exports.ADDITIVE_RATE_BY_NAME = {
  "Chromatech Classic":                         { price: 110.00, unit: "per metre" },
  "Chromatech Plus":                            { price: 130.00, unit: "per metre" },
  "Chromatech Pro":                             { price: 150.00, unit: "per metre" },
  "Chromatech Premium":                         { price: null,   unit: "contact salesman" },
  "Winter Handling (Nov 1st \u2013 Mar 31st)":  { price: 20.00,  unit: "per m3" },
  "Fibermesh Reinforcing":                      { price: 40.00,  unit: "per m3" },
  "Non-Chloride Accelerator (NCA) (Per Litre)": { price: 9.00,   unit: "per litre" },
  "Superplasticizer (Per Dose)":                { price: 8.00,   unit: "per dose" },
  "PRA (Watertight Admixture 2%)":              { price: 95.00,  unit: "per metre" },
  "Delayset":                                   { price: 13.00,  unit: "per litre" },
  "Coloured Washout Charge":                    { price: 100.00, unit: "each" },
  "Customer Added Products":                    { price: 20.00,  unit: "per m3" },
};
