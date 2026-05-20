import type { LawReference } from "./law/types";

export type ParsedLawReference = LawReference;

const lawCodePattern = String.raw`[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]*`;
const sectionPattern = String.raw`\d+[A-Za-z]?`;
const articleMarkerPattern = String.raw`(?:Art\.?|Artikel)`;

const lawFirstPattern = new RegExp(
  String.raw`^(${lawCodePattern})\s+(?:§\s*)?(${sectionPattern})$`,
  "u",
);

const sectionFirstPattern = new RegExp(
  String.raw`^(?:§\s*)?(${sectionPattern})\s+(${lawCodePattern})$`,
  "u",
);

const articleFirstPattern = new RegExp(
  String.raw`^${articleMarkerPattern}\s*(${sectionPattern})\s+(${lawCodePattern})$`,
  "iu",
);

const lawFirstArticlePattern = new RegExp(
  String.raw`^(${lawCodePattern})\s+${articleMarkerPattern}\s*(${sectionPattern})$`,
  "iu",
);

export function parseLawReference(input: string): ParsedLawReference | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const articleFirstMatch = normalized.match(articleFirstPattern);
  if (articleFirstMatch && articleFirstMatch[2].toUpperCase() === "GG") {
    return {
      lawCode: "GG",
      section: articleFirstMatch[1],
      referenceType: "article",
    };
  }

  const lawFirstArticleMatch = normalized.match(lawFirstArticlePattern);
  if (lawFirstArticleMatch && lawFirstArticleMatch[1].toUpperCase() === "GG") {
    return {
      lawCode: "GG",
      section: lawFirstArticleMatch[2],
      referenceType: "article",
    };
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
