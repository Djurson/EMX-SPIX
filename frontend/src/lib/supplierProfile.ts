/**
 * Separator placed between an EMX prefix and the supplier article number.
 * Some suppliers use a dash (`BM-12345`), others nothing (`PS12345`).
 */
export type Separator = "-" | "";

/**
 * A supplier's article-numbering rule. The EMX item number is built as
 * `<prefix><separator><supplier article number>`.
 */
export interface SupplierProfile {
  /** Display name, e.g. `"Bolt"` or `"Polisport"`. */
  name: string;
  /** Prefix prepended to the supplier number, e.g. `"BM"`, `"PS"`. */
  prefix: string;
  /** Separator between prefix and supplier number. */
  separator: Separator;
}

/** Built-in starter profiles for the suppliers we have example files for. */
export const DEFAULT_PROFILES: SupplierProfile[] = [
  { name: "Bolt", prefix: "BM", separator: "-" },
  { name: "Polisport", prefix: "PS", separator: "" },
];

/**
 * Builds the EMX item number for a supplier article number under a profile.
 * @param supplierNumber - The raw supplier/manufacturer article number.
 * @param profile - The supplier's prefix + separator rule.
 * @returns The EMX item number, e.g. `"BM-12345"`. Empty input yields `""`.
 */
export function BuildArticleNumber(supplierNumber: string, profile: SupplierProfile): string {
  const trimmed = supplierNumber.trim();
  if (!trimmed) return "";
  return `${profile.prefix}${profile.separator}${trimmed}`;
}
