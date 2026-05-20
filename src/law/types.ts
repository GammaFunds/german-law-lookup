export type LawReferenceType = "section" | "article";

export interface LawReference {
  lawCode: string;
  section: string;
  referenceType?: LawReferenceType;
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
