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
}): string {
  return `${referencePrefix(reference.referenceType)} ${reference.section}`;
}
