import type { LawReference } from "./law/types";

export type ParsedLawReference = LawReference;

const lawCodePattern = String.raw`[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]*`;
const sectionPattern = String.raw`\d+[A-Za-z]?`;
const articleMarkerPattern = String.raw`(?:Art\.?|Artikel)`;
const explicitSpacedLawCodes = [
  "SGB I",
  "SGB II",
  "SGB III",
  "SGB IV",
  "SGB V",
  "SGB VI",
  "SGB VII",
  "SGB VIII",
  "SGB IX",
  "SGB X",
  "SGB XI",
  "SGB XII",
  "SGB XIV",
] as const;
const explicitSpacedLawCodePattern = explicitSpacedLawCodes
  .map((lawCode) => lawCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

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

const explicitSpacedLawFirstPattern = new RegExp(
  String.raw`^(${explicitSpacedLawCodePattern})\s+(?:§\s*)?(${sectionPattern})$`,
  "iu",
);

const explicitSpacedSectionFirstPattern = new RegExp(
  String.raw`^(?:§\s*)?(${sectionPattern})\s+(${explicitSpacedLawCodePattern})$`,
  "iu",
);

const egbgbArticlePattern = sectionPattern;
const egbgbSubsectionPattern = sectionPattern;
const egbgbArticleSectionFirstPattern = new RegExp(
  String.raw`^${articleMarkerPattern}\s*(${egbgbArticlePattern})\s+§\s*(${egbgbSubsectionPattern})\s+(EGBGB)$`,
  "iu",
);
const egbgbLawFirstArticleSectionPattern = new RegExp(
  String.raw`^(EGBGB)\s+${articleMarkerPattern}\s*(${egbgbArticlePattern})\s+§\s*(${egbgbSubsectionPattern})$`,
  "iu",
);
const egbgbArticleFirstPattern = new RegExp(
  String.raw`^${articleMarkerPattern}\s*(${egbgbArticlePattern})\s+(EGBGB)$`,
  "iu",
);
const egbgbLawFirstArticlePattern = new RegExp(
  String.raw`^(EGBGB)\s+${articleMarkerPattern}\s*(${egbgbArticlePattern})$`,
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

  const egbgbArticleSectionFirstMatch = normalized.match(egbgbArticleSectionFirstPattern);
  if (egbgbArticleSectionFirstMatch) {
    return {
      lawCode: "EGBGB",
      section: egbgbArticleSectionFirstMatch[1],
      subsection: egbgbArticleSectionFirstMatch[2],
      referenceType: "article",
    };
  }

  const egbgbLawFirstArticleSectionMatch = normalized.match(egbgbLawFirstArticleSectionPattern);
  if (egbgbLawFirstArticleSectionMatch) {
    return {
      lawCode: "EGBGB",
      section: egbgbLawFirstArticleSectionMatch[2],
      subsection: egbgbLawFirstArticleSectionMatch[3],
      referenceType: "article",
    };
  }

  const egbgbArticleFirstMatch = normalized.match(egbgbArticleFirstPattern);
  if (egbgbArticleFirstMatch) {
    return {
      lawCode: "EGBGB",
      section: egbgbArticleFirstMatch[1],
      referenceType: "article",
    };
  }

  const egbgbLawFirstArticleMatch = normalized.match(egbgbLawFirstArticlePattern);
  if (egbgbLawFirstArticleMatch) {
    return {
      lawCode: "EGBGB",
      section: egbgbLawFirstArticleMatch[2],
      referenceType: "article",
    };
  }

  const explicitSpacedLawFirstMatch = normalized.match(explicitSpacedLawFirstPattern);
  if (explicitSpacedLawFirstMatch) {
    return {
      lawCode: explicitSpacedLawFirstMatch[1].toUpperCase(),
      section: explicitSpacedLawFirstMatch[2],
    };
  }

  const explicitSpacedSectionFirstMatch = normalized.match(explicitSpacedSectionFirstPattern);
  if (explicitSpacedSectionFirstMatch) {
    return {
      lawCode: explicitSpacedSectionFirstMatch[2].toUpperCase(),
      section: explicitSpacedSectionFirstMatch[1],
    };
  }

  const lawFirstMatch = normalized.match(lawFirstPattern);
  if (lawFirstMatch) {
    if (lawFirstMatch[1].toUpperCase() === "EGBGB") {
      return null;
    }

    return {
      lawCode: lawFirstMatch[1].toUpperCase(),
      section: lawFirstMatch[2],
    };
  }

  const sectionFirstMatch = normalized.match(sectionFirstPattern);
  if (sectionFirstMatch) {
    if (sectionFirstMatch[2].toUpperCase() === "EGBGB") {
      return null;
    }

    return {
      lawCode: sectionFirstMatch[2].toUpperCase(),
      section: sectionFirstMatch[1],
    };
  }

  return null;
}
