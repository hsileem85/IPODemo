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
  coveredStart: string;
  coveredEnd: string;
  uncoveredStart: string;
  uncoveredEnd: string;
  phase: "covered" | "uncovered";
  coveredFinalized: boolean;
}

export const INITIAL_IPO_STOCKS: IPOStock[] = [
  {
    id: "IPO-ADIB",
    securityNameAr: "بنك أبوظبي الإسلامي - مصر (زيادة رأس مال - إصدار حقوق)",
    securityNameEn: "ADIB Egypt – Capital Increase (Rights Issue)",
    code: "ADIB",
    symbol: "ADIB",
    isin: "EGS60121C014",
    coveredStart: "2026-05-01",
    coveredEnd: "2026-05-20",
    uncoveredStart: "2026-05-21",
    uncoveredEnd: "2026-06-05",
    phase: "covered",
    coveredFinalized: false,
  },
  {
    id: "IPO-EDITA",
    securityNameAr: "إيديتا لصناعة الغذاء (زيادة رأس مال - إصدار حقوق)",
    securityNameEn: "Edita Food Industries – Capital Increase (Rights Issue)",
    code: "EDITA",
    symbol: "EDITA",
    isin: "EGS722G1C010",
    coveredStart: "2026-05-05",
    coveredEnd: "2026-05-25",
    uncoveredStart: "2026-05-26",
    uncoveredEnd: "2026-06-10",
    phase: "covered",
    coveredFinalized: false,
  },
];
