import type { LawReferenceType } from "./types";

export function normalizeReferenceType(referenceType?: LawReferenceType): LawReferenceType {
  return referenceType === "article" ? "article" : "section";
}

export function referencePrefix(referenceType?: LawReferenceType): "§" | "Art." {
  return normalizeReferenceType(referenceType) === "article" ? "Art." : "§";
}

export function formatReferenceLabel(reference: {
  section: string;
  referenceType?: LawReferenceType;
  subsection?: string;
}): string {
  if (normalizeReferenceType(reference.referenceType) === "article" && reference.subsection) {
    return `Art. ${reference.section} § ${reference.subsection}`;
  }

  return `${referencePrefix(reference.referenceType)} ${reference.section}`;
}
