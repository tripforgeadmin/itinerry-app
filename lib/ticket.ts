import { supabase } from "@/lib/supabase";

/**
 * Case ticket ids: ITN-<CTY>-<yymmdd>-<nnnn>
 *  - CTY    = 3-letter destination abbreviation (ISO 3166-1 alpha-3, with a few widely-recognized
 *             sporting-style overrides, e.g. Germany → GER not DEU, per the ticket spec)
 *  - yymmdd = Bangkok-local date
 *  - nnnn   = per-day running number from the atomic next_ticket_number() counter
 */

// ISO 3166-1 alpha-2 → alpha-3 for every country in lib/countries.ts.
const ISO_ALPHA3: Record<string, string> = {
  AF: "AFG", AL: "ALB", DZ: "DZA", AD: "AND", AO: "AGO", AG: "ATG", AR: "ARG", AM: "ARM",
  AU: "AUS", AT: "AUT", AZ: "AZE", BS: "BHS", BH: "BHR", BD: "BGD", BB: "BRB", BY: "BLR",
  BE: "BEL", BZ: "BLZ", BJ: "BEN", BT: "BTN", BO: "BOL", BA: "BIH", BW: "BWA", BR: "BRA",
  BN: "BRN", BG: "BGR", BF: "BFA", BI: "BDI", CV: "CPV", KH: "KHM", CM: "CMR", CA: "CAN",
  CF: "CAF", TD: "TCD", CL: "CHL", CN: "CHN", CO: "COL", KM: "COM", CG: "COG", CD: "COD",
  CR: "CRI", CI: "CIV", HR: "HRV", CU: "CUB", CY: "CYP", CZ: "CZE", DK: "DNK", DJ: "DJI",
  DM: "DMA", DO: "DOM", EC: "ECU", EG: "EGY", SV: "SLV", GQ: "GNQ", ER: "ERI", EE: "EST",
  SZ: "SWZ", ET: "ETH", FJ: "FJI", FI: "FIN", FR: "FRA", GA: "GAB", GM: "GMB", GE: "GEO",
  DE: "DEU", GH: "GHA", GR: "GRC", GD: "GRD", GT: "GTM", GN: "GIN", GW: "GNB", GY: "GUY",
  HT: "HTI", HN: "HND", HK: "HKG", HU: "HUN", IS: "ISL", IN: "IND", ID: "IDN", IR: "IRN",
  IQ: "IRQ", IE: "IRL", IL: "ISR", IT: "ITA", JM: "JAM", JP: "JPN", JO: "JOR", KZ: "KAZ",
  KE: "KEN", KI: "KIR", KP: "PRK", KR: "KOR", KW: "KWT", KG: "KGZ", LA: "LAO", LV: "LVA",
  LB: "LBN", LS: "LSO", LR: "LBR", LY: "LBY", LI: "LIE", LT: "LTU", LU: "LUX", MO: "MAC",
  MG: "MDG", MW: "MWI", MY: "MYS", MV: "MDV", ML: "MLI", MT: "MLT", MH: "MHL", MR: "MRT",
  MU: "MUS", MX: "MEX", FM: "FSM", MD: "MDA", MC: "MCO", MN: "MNG", ME: "MNE", MA: "MAR",
  MZ: "MOZ", MM: "MMR", NA: "NAM", NR: "NRU", NP: "NPL", NL: "NLD", NZ: "NZL", NI: "NIC",
  NE: "NER", NG: "NGA", MK: "MKD", NO: "NOR", OM: "OMN", PK: "PAK", PW: "PLW", PS: "PSE",
  PA: "PAN", PG: "PNG", PY: "PRY", PE: "PER", PH: "PHL", PL: "POL", PT: "PRT", QA: "QAT",
  RO: "ROU", RU: "RUS", RW: "RWA", KN: "KNA", LC: "LCA", VC: "VCT", WS: "WSM", SM: "SMR",
  ST: "STP", SA: "SAU", SN: "SEN", RS: "SRB", SC: "SYC", SL: "SLE", SG: "SGP", SK: "SVK",
  SI: "SVN", SB: "SLB", SO: "SOM", ZA: "ZAF", SS: "SSD", ES: "ESP", LK: "LKA", SD: "SDN",
  SR: "SUR", SE: "SWE", CH: "CHE", SY: "SYR", TW: "TWN", TJ: "TJK", TZ: "TZA", TH: "THA",
  TL: "TLS", TG: "TGO", TO: "TON", TT: "TTO", TN: "TUN", TR: "TUR", TM: "TKM", TV: "TUV",
  UG: "UGA", UA: "UKR", AE: "ARE", GB: "GBR", US: "USA", UY: "URY", UZ: "UZB", VU: "VUT",
  VA: "VAT", VE: "VEN", VN: "VNM", YE: "YEM", ZM: "ZMB", ZW: "ZWE",
};

// Widely-recognized 3-letter forms that differ from strict ISO alpha-3 (the spec's example is GER).
const RECOGNIZABLE: Record<string, string> = {
  DE: "GER", NL: "NED", CH: "SUI", GR: "GRE", PT: "POR", DK: "DEN", HR: "CRO", ZA: "RSA", AE: "UAE",
};

export function countryAbbrev(alpha2: string): string {
  const code = (alpha2 || "").toUpperCase();
  return RECOGNIZABLE[code] ?? ISO_ALPHA3[code] ?? (code ? `${code}X`.slice(0, 3) : "XXX");
}

/** Bangkok-local date as yymmdd (tickets follow the Thai business day, not server UTC). */
export function bangkokDay(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(2).replace(/-/g, "");
}

/** Mint the next ticket id for a destination. Fail-soft: if the counter is unreachable the
 * submit must still succeed, so fall back to a random 4-digit suffix. */
export async function generateTicketId(destAlpha2: string): Promise<string> {
  const day = bangkokDay();
  let n: number;
  try {
    const { data, error } = await supabase.rpc("next_ticket_number", { p_day: day });
    if (error || typeof data !== "number") throw error ?? new Error("counter returned no number");
    n = data;
  } catch (err) {
    console.error("ticket counter error:", err);
    n = Math.floor(1000 + Math.random() * 9000);
  }
  return `ITN-${countryAbbrev(destAlpha2)}-${day}-${String(n).padStart(4, "0")}`;
}
