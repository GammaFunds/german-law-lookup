import type { LawReference } from "./law/types";

export type ParsedLawReference = LawReference;

const lawCodePattern = String.raw`[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]*`;
const sectionPattern = String.raw`\d+[A-Za-z]?`;

const lawFirstPattern = new RegExp(
  String.raw`^(${lawCodePattern})\s+(?:§\s*)?(${sectionPattern})$`,
  "u",
);

const sectionFirstPattern = new RegExp(
  String.raw`^§\s*(${sectionPattern})\s+(${lawCodePattern})$`,
  "u",
);

export function parseLawReference(input: string): ParsedLawReference | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const lawFirstMatch = normalized.match(lawFirstPattern);
  if (lawFirstMatch) {
    return {
      lawCode: lawFirstMatch[1].toUpperCase(),
      section: lawFirstMatch[2],
    };
  }

  const sectionFirstMatch = normalized.match(sectionFirstPattern);
  if (sectionFirstMatch) {
    return {
      lawCode: sectionFirstMatch[2].toUpperCase(),
      section: sectionFirstMatch[1],
    };
  }

  return null;
}
