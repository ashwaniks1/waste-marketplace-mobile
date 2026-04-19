export type CountryCode = string; // ISO-3166-1 alpha-2
export type CurrencyCode = string; // ISO-4217

const MAP: Record<string, CurrencyCode> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  IN: "INR",
  AU: "AUD",
  NZ: "NZD",
  SG: "SGD",
  AE: "AED",
  SA: "SAR",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  MX: "MXN",
  BR: "BRL",
};

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!t) return null;
  if (!/^[A-Z]{2}$/.test(t)) return null;
  return t;
}

export function currencyForCountry(countryCode: string | null | undefined): CurrencyCode {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) return "USD";
  return MAP[cc] ?? "USD";
}

