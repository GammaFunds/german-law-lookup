export type LawReferenceType = "section" | "article";
export type LawSourceVariant = "official-de" | "translation-en";

export interface LawReference {
  lawCode: string;
  section: string;
  referenceType?: LawReferenceType;
  sourceVariant?: LawSourceVariant;
  subsection?: string;
  sentence?: string;
}

export interface LawSection {
  providerId: string;
  providerLabel: string;
  sourceUrl?: string;
  lawCode: string;
  lawTitle: string;
  section: string;
  referenceType?: LawReferenceType;
  sourceVariant?: LawSourceVariant;
  subsection?: string;
  heading?: string;
  text: string;
  retrievedAt: string;
  validFrom?: string;
  validTo?: string;
  cacheStatus: "live" | "cached" | "stale";
  isOfficialSource: boolean;
  isAuthoritativeText: boolean;
}

export interface LawSearchResult {
  label: string;
  reference: LawReference;
}
