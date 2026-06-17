/**
 * Damodaran 2025 industry cost-of-equity table.
 * Source: Aswath Damodaran, NYU Stern — January 2025 dataset.
 * Extracted from "Multiple-Growth 5Y Template" (Sheet: COE lasted).
 *
 * Fields:
 *   beta — unlevered industry beta
 *   coe  — cost of equity (CAPM, decimal)
 *   wacc — weighted average cost of capital (decimal)
 */

export interface IndustryData {
  name: string;
  beta: number;
  coe:  number;
  wacc: number;
}

export const DAMODARAN_TABLE: IndustryData[] = [
  { name: "Advertising",                            beta: 1.21, coe: 0.0935, wacc: 0.0781 },
  { name: "Aerospace/Defense",                      beta: 0.95, coe: 0.0817, wacc: 0.0760 },
  { name: "Air Transport",                          beta: 1.19, coe: 0.0924, wacc: 0.0672 },
  { name: "Apparel",                                beta: 0.94, coe: 0.0812, wacc: 0.0713 },
  { name: "Auto & Truck",                           beta: 1.46, coe: 0.1045, wacc: 0.0938 },
  { name: "Auto Parts",                             beta: 1.34, coe: 0.0992, wacc: 0.0818 },
  { name: "Bank (Money Center)",                    beta: 0.76, coe: 0.0734, wacc: 0.0498 },
  { name: "Banks (Regional)",                       beta: 0.40, coe: 0.0573, wacc: 0.0498 },
  { name: "Beverage (Alcoholic)",                   beta: 0.81, coe: 0.0757, wacc: 0.0648 },
  { name: "Beverage (Soft)",                        beta: 0.64, coe: 0.0681, wacc: 0.0633 },
  { name: "Broadcasting",                           beta: 0.47, coe: 0.0605, wacc: 0.0509 },
  { name: "Brokerage & Investment Banking",         beta: 1.17, coe: 0.0917, wacc: 0.0608 },
  { name: "Building Materials",                     beta: 1.11, coe: 0.0891, wacc: 0.0785 },
  { name: "Business & Consumer Services",           beta: 0.89, coe: 0.0791, wacc: 0.0723 },
  { name: "Cable TV",                               beta: 0.74, coe: 0.0725, wacc: 0.0520 },
  { name: "Chemical (Basic)",                       beta: 1.01, coe: 0.0846, wacc: 0.0622 },
  { name: "Chemical (Diversified)",                 beta: 0.85, coe: 0.0774, wacc: 0.0523 },
  { name: "Chemical (Specialty)",                   beta: 0.97, coe: 0.0828, wacc: 0.0725 },
  { name: "Coal & Related Energy",                  beta: 1.07, coe: 0.0873, wacc: 0.0841 },
  { name: "Computer Services",                      beta: 1.09, coe: 0.0880, wacc: 0.0783 },
  { name: "Computers/Peripherals",                  beta: 1.35, coe: 0.0997, wacc: 0.0971 },
  { name: "Construction Supplies",                  beta: 1.15, coe: 0.0908, wacc: 0.0829 },
  { name: "Diversified",                            beta: 0.88, coe: 0.0788, wacc: 0.0730 },
  { name: "Drugs (Biotechnology)",                  beta: 1.14, coe: 0.0901, wacc: 0.0849 },
  { name: "Drugs (Pharmaceutical)",                 beta: 0.98, coe: 0.0833, wacc: 0.0785 },
  { name: "Education",                              beta: 0.78, coe: 0.0743, wacc: 0.0675 },
  { name: "Electrical Equipment",                   beta: 1.25, coe: 0.0953, wacc: 0.0899 },
  { name: "Electronics (Consumer & Office)",        beta: 0.87, coe: 0.0781, wacc: 0.0763 },
  { name: "Electronics (General)",                  beta: 0.97, coe: 0.0828, wacc: 0.0785 },
  { name: "Engineering/Construction",               beta: 1.21, coe: 0.0935, wacc: 0.0869 },
  { name: "Entertainment",                          beta: 0.83, coe: 0.0763, wacc: 0.0713 },
  { name: "Environmental & Waste Services",         beta: 0.95, coe: 0.0817, wacc: 0.0743 },
  { name: "Farming/Agriculture",                    beta: 1.13, coe: 0.0899, wacc: 0.0727 },
  { name: "Financial Svcs. (Non-bank & Insurance)", beta: 0.97, coe: 0.0827, wacc: 0.0500 },
  { name: "Food Processing",                        beta: 0.61, coe: 0.0666, wacc: 0.0579 },
  { name: "Food Wholesalers",                       beta: 0.87, coe: 0.0782, wacc: 0.0653 },
  { name: "Furn/Home Furnishings",                  beta: 0.82, coe: 0.0762, wacc: 0.0653 },
  { name: "Green & Renewable Energy",               beta: 0.86, coe: 0.0777, wacc: 0.0604 },
  { name: "Healthcare Products",                    beta: 0.91, coe: 0.0800, wacc: 0.0754 },
  { name: "Healthcare Support Services",            beta: 0.87, coe: 0.0784, wacc: 0.0683 },
  { name: "Heathcare Information and Technology",   beta: 1.11, coe: 0.0889, wacc: 0.0822 },
  { name: "Homebuilding",                           beta: 0.91, coe: 0.0801, wacc: 0.0727 },
  { name: "Hospitals/Healthcare Facilities",        beta: 0.80, coe: 0.0752, wacc: 0.0619 },
  { name: "Hotel/Gaming",                           beta: 1.08, coe: 0.0877, wacc: 0.0736 },
  { name: "Household Products",                     beta: 0.82, coe: 0.0759, wacc: 0.0703 },
  { name: "Information Services",                   beta: 0.92, coe: 0.0806, wacc: 0.0700 },
  { name: "Insurance (General)",                    beta: 0.67, coe: 0.0695, wacc: 0.0634 },
  { name: "Insurance (Life)",                       beta: 0.64, coe: 0.0682, wacc: 0.0560 },
  { name: "Insurance (Prop/Cas.)",                  beta: 0.48, coe: 0.0611, wacc: 0.0578 },
  { name: "Investments & Asset Management",         beta: 0.66, coe: 0.0689, wacc: 0.0613 },
  { name: "Machinery",                              beta: 0.96, coe: 0.0825, wacc: 0.0770 },
  { name: "Metals & Mining",                        beta: 1.04, coe: 0.0860, wacc: 0.0820 },
  { name: "Office Equipment & Services",            beta: 1.33, coe: 0.0990, wacc: 0.0792 },
  { name: "Oil/Gas (Integrated)",                   beta: 0.30, coe: 0.0529, wacc: 0.0507 },
  { name: "Oil/Gas (Production and Exploration)",   beta: 0.72, coe: 0.0717, wacc: 0.0625 },
  { name: "Oil/Gas Distribution",                   beta: 0.67, coe: 0.0693, wacc: 0.0578 },
  { name: "Oilfield Svcs/Equip.",                   beta: 0.95, coe: 0.0819, wacc: 0.0704 },
  { name: "Packaging & Container",                  beta: 1.02, coe: 0.0851, wacc: 0.0675 },
  { name: "Paper/Forest Products",                  beta: 0.96, coe: 0.0822, wacc: 0.0693 },
  { name: "Power",                                  beta: 0.48, coe: 0.0610, wacc: 0.0501 },
  { name: "Precious Metals",                        beta: 0.84, coe: 0.0768, wacc: 0.0747 },
  { name: "Publishing & Newspapers",                beta: 0.56, coe: 0.0646, wacc: 0.0595 },
  { name: "R.E.I.T.",                               beta: 0.64, coe: 0.0681, wacc: 0.0532 },
  { name: "Real Estate (Development)",              beta: 0.84, coe: 0.0771, wacc: 0.0582 },
  { name: "Real Estate (General/Diversified)",      beta: 0.81, coe: 0.0756, wacc: 0.0625 },
  { name: "Real Estate (Operations & Services)",    beta: 0.97, coe: 0.0826, wacc: 0.0741 },
  { name: "Recreation",                             beta: 1.02, coe: 0.0851, wacc: 0.0676 },
  { name: "Reinsurance",                            beta: 0.58, coe: 0.0654, wacc: 0.0564 },
  { name: "Restaurant/Dining",                      beta: 0.92, coe: 0.0807, wacc: 0.0716 },
  { name: "Retail (Automotive)",                    beta: 0.94, coe: 0.0812, wacc: 0.0678 },
  { name: "Retail (Building Supply)",               beta: 1.54, coe: 0.1080, wacc: 0.0951 },
  { name: "Retail (Distributors)",                  beta: 0.95, coe: 0.0818, wacc: 0.0722 },
  { name: "Retail (General)",                       beta: 0.81, coe: 0.0754, wacc: 0.0727 },
  { name: "Retail (Grocery and Food)",              beta: 1.12, coe: 0.0894, wacc: 0.0724 },
  { name: "Retail (REITs)",                         beta: 0.62, coe: 0.0672, wacc: 0.0557 },
  { name: "Retail (Special Lines)",                 beta: 1.09, coe: 0.0881, wacc: 0.0801 },
  { name: "Rubber & Tires",                         beta: 0.53, coe: 0.0631, wacc: 0.0448 },
  { name: "Semiconductor",                          beta: 1.52, coe: 0.1072, wacc: 0.1055 },
  { name: "Semiconductor Equip",                    beta: 1.40, coe: 0.1018, wacc: 0.0989 },
  { name: "Shipbuilding & Marine",                  beta: 0.75, coe: 0.0731, wacc: 0.0669 },
  { name: "Shoe",                                   beta: 1.02, coe: 0.0849, wacc: 0.0801 },
  { name: "Software (Entertainment)",               beta: 1.03, coe: 0.0854, wacc: 0.0844 },
  { name: "Software (Internet)",                    beta: 1.69, coe: 0.1148, wacc: 0.1066 },
  { name: "Software (System & Application)",        beta: 1.28, coe: 0.0964, wacc: 0.0934 },
  { name: "Steel",                                  beta: 1.06, coe: 0.0869, wacc: 0.0776 },
  { name: "Telecom (Wireless)",                     beta: 0.54, coe: 0.0635, wacc: 0.0548 },
  { name: "Telecom. Equipment",                     beta: 0.92, coe: 0.0807, wacc: 0.0772 },
  { name: "Telecom. Services",                      beta: 0.63, coe: 0.0675, wacc: 0.0539 },
  { name: "Tobacco",                                beta: 0.79, coe: 0.0749, wacc: 0.0694 },
  { name: "Transportation",                         beta: 0.86, coe: 0.0779, wacc: 0.0672 },
  { name: "Transportation (Railroads)",             beta: 0.98, coe: 0.0830, wacc: 0.0727 },
  { name: "Trucking",                               beta: 1.01, coe: 0.0846, wacc: 0.0752 },
  { name: "Utility (General)",                      beta: 0.24, coe: 0.0502, wacc: 0.0436 },
  { name: "Utility (Water)",                        beta: 0.41, coe: 0.0579, wacc: 0.0493 },
  { name: "Total Market",                           beta: 0.91, coe: 0.0802, wacc: 0.0696 },
  { name: "Total Market (without financials)",      beta: 0.99, coe: 0.0837, wacc: 0.0772 },
];

/** Find Damodaran data for a Finnhub industry name (fuzzy match). */
export function lookupIndustry(finnhubIndustry: string | null): IndustryData | null {
  if (!finnhubIndustry) return null;
  const q = finnhubIndustry.toLowerCase();

  // Direct match first
  const direct = DAMODARAN_TABLE.find(d => d.name.toLowerCase() === q);
  if (direct) return direct;

  // Keyword fallback map
  const KEYWORDS: [string, string][] = [
    ["semiconductor",   "Semiconductor"],
    ["software",        "Software (System & Application)"],
    ["internet",        "Software (Internet)"],
    ["biotech",         "Drugs (Biotechnology)"],
    ["pharma",          "Drugs (Pharmaceutical)"],
    ["bank",            "Banks (Regional)"],
    ["insurance",       "Insurance (General)"],
    ["real estate",     "Real Estate (General/Diversified)"],
    ["reit",            "R.E.I.T."],
    ["retail",          "Retail (General)"],
    ["oil",             "Oil/Gas (Production and Exploration)"],
    ["gas",             "Oil/Gas (Production and Exploration)"],
    ["energy",          "Green & Renewable Energy"],
    ["utility",         "Utility (General)"],
    ["telecom",         "Telecom. Services"],
    ["wireless",        "Telecom (Wireless)"],
    ["healthcare",      "Healthcare Products"],
    ["hospital",        "Hospitals/Healthcare Facilities"],
    ["media",           "Entertainment"],
    ["entertainment",   "Entertainment"],
    ["auto",            "Auto & Truck"],
    ["aerospace",       "Aerospace/Defense"],
    ["food",            "Food Processing"],
    ["beverage",        "Beverage (Soft)"],
    ["chemical",        "Chemical (Specialty)"],
    ["metal",           "Metals & Mining"],
    ["mining",          "Metals & Mining"],
    ["paper",           "Paper/Forest Products"],
    ["machinery",       "Machinery"],
    ["transport",       "Transportation"],
    ["airline",         "Air Transport"],
    ["computer",        "Computer Services"],
    ["hotel",           "Hotel/Gaming"],
    ["restaurant",      "Restaurant/Dining"],
    ["construction",    "Engineering/Construction"],
  ];

  for (const [kw, industry] of KEYWORDS) {
    if (q.includes(kw)) {
      return DAMODARAN_TABLE.find(d => d.name === industry) ?? null;
    }
  }

  return DAMODARAN_TABLE.find(d => d.name === "Total Market") ?? null;
}

/** Returns sorted list of all industry names for a dropdown. */
export function getIndustryNames(): string[] {
  return DAMODARAN_TABLE
    .filter(d => !d.name.startsWith("Total"))
    .map(d => d.name)
    .sort();
}
