// ─────────────────────────────────────────────────────────────────────────────
// IPO Stock data — single source of truth
// Add or edit stocks here; all screens consume this file.
// ─────────────────────────────────────────────────────────────────────────────

export interface IPOStock {
  id: string;
  securityNameAr: string;
  securityNameEn: string;
  code: string;
  symbol: string;
  isin: string;
  pricePerShare: number;
  coveredStart: string;
  coveredEnd: string;
  uncoveredStart: string;
  uncoveredEnd: string;
  phase: "covered" | "uncovered";
  coveredFinalized: boolean;
  eligibleSharesSnapshot: number;
  offeringSize: number;
}

export const INITIAL_IPO_STOCKS: IPOStock[] = [
  {
    id: "IPO-ADIB",
    securityNameAr: "بنك أبوظبي الإسلامي - مصر",
    securityNameEn: "ADIB Egypt",
    code: "ADIB",
    symbol: "ADIB",
    isin: "EGS60121C014",
    pricePerShare: 20.00,
    coveredStart: "2026-05-01",
    coveredEnd: "2026-05-20",
    uncoveredStart: "2026-05-21",
    uncoveredEnd: "2026-06-05",
    phase: "covered",
    coveredFinalized: false,
    eligibleSharesSnapshot: 0,
    offeringSize: 50_000_000,
  },
  {
    id: "IPO-EDITA",
    securityNameAr: "إيديتا لصناعة الغذاء",
    securityNameEn: "Edita Food Industries",
    code: "EDITA",
    symbol: "EDITA",
    isin: "EGS722G1C010",
    pricePerShare: 15.50,
    coveredStart: "2026-05-05",
    coveredEnd: "2026-05-25",
    uncoveredStart: "2026-05-26",
    uncoveredEnd: "2026-06-10",
    phase: "covered",
    coveredFinalized: false,
    eligibleSharesSnapshot: 0,
    offeringSize: 30_000_000,
  },
];
