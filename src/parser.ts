import type { LawJurisdiction, LawReference } from "./law/types";

export type ParsedLawReference = LawReference;

const jurisdictionPattern = String.raw`(?:AT|DE)`;
const lawCodePattern = String.raw`[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9-]*`;
const sectionPattern = String.raw`\d+[A-Za-z]?`;
const articleMarkerPattern = String.raw`(?:Art\.?|Artikel)`;
const explicitSlashLawCodes = [
  "FreizügG/EU",
] as const;
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
const explicitSlashLawCodePattern = explicitSlashLawCodes
  .map((lawCode) => lawCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const atLawFirstPattern = new RegExp(
  String.raw`^AT\s+(${lawCodePattern})\s+(?:§\s*)?(${sectionPattern})$`,
  "u",
);

const atSectionFirstPattern = new RegExp(
  String.raw`^AT\s+(?:§\s*)?(${sectionPattern})\s+(${lawCodePattern})$`,
  "u",
);

const atLawLastPattern = new RegExp(
  String.raw`^(?:§\s*)?(${sectionPattern})\s+(${lawCodePattern})\s+AT$`,
  "u",
);

const atLawMiddlePattern = new RegExp(
  String.raw`^(${lawCodePattern})\s+AT\s+(?:§\s*)?(${sectionPattern})$`,
  "u",
);

const atArticleFirstPattern = new RegExp(
  String.raw`^AT\s+${articleMarkerPattern}\s*(${sectionPattern})\s+(${lawCodePattern})$`,
  "iu",
);

const atLawFirstArticlePattern = new RegExp(
  String.raw`^AT\s+(${lawCodePattern})\s+${articleMarkerPattern}\s*(${sectionPattern})$`,
  "iu",
);

const atArticleLawLastPattern = new RegExp(
  String.raw`^${articleMarkerPattern}\s*(${sectionPattern})\s+(${lawCodePattern})\s+AT$`,
  "iu",
);

const atLawArticleMiddlePattern = new RegExp(
  String.raw`^(${lawCodePattern})\s+${articleMarkerPattern}\s*(${sectionPattern})\s+AT$`,
  "iu",
);

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
const explicitSlashLawFirstPattern = new RegExp(
  String.raw`^(${explicitSlashLawCodePattern})\s+(?:§\s*)?(${sectionPattern})$`,
  "iu",
);
const explicitSlashSectionFirstPattern = new RegExp(
  String.raw`^(?:§\s*)?(${sectionPattern})\s+(${explicitSlashLawCodePattern})$`,
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

const swissFedlexLawCodes = [
  "BV",
  "ZGB",
  "OR",
  "STGB",
  "ZPO",
  "STPO",
  "SCHKG",
  "VWVG",
  "BGG",
  "DSG",
];

const swissFedlexLawCodeSet = new Set(swissFedlexLawCodes);

export function enrichJurisdiction(
  reference: ParsedLawReference,
  selectedJurisdiction: LawJurisdiction,
): ParsedLawReference {
  if (selectedJurisdiction === "AT" && !reference.jurisdiction) {
    return { ...reference, jurisdiction: "AT" };
  }
  if (
    selectedJurisdiction === "CH" &&
    !reference.jurisdiction &&
    reference.referenceType === "article" &&
    swissFedlexLawCodeSet.has(reference.lawCode)
  ) {
    return { ...reference, jurisdiction: "CH" };
  }
  return reference;
}

export function parseLawReferenceWithSelectedJurisdiction(
  input: string,
  selectedJurisdiction: LawJurisdiction,
): ParsedLawReference | null {
  const parsedReference = parseLawReference(input);
  if (parsedReference) {
    if (selectedJurisdiction !== "CH") {
      return enrichJurisdiction(parsedReference, selectedJurisdiction);
    }

    if (parsedReference.jurisdiction) {
      return parsedReference;
    }

    const enrichedReference = enrichJurisdiction(parsedReference, "CH");
    return enrichedReference.jurisdiction === "CH" ? enrichedReference : null;
  }

  if (selectedJurisdiction === "AT") {
    return parseLawReference(`AT ${input}`);
  }

  if (selectedJurisdiction === "CH") {
    const normalized = input.trim().replace(/\s+/g, " ");
    if (normalized) {
      const artFirstMatch = normalized.match(articleFirstPattern);
      if (artFirstMatch) {
        const lawCode = artFirstMatch[2].toUpperCase();
        if (swissFedlexLawCodeSet.has(lawCode)) {
          return {
            lawCode,
            section: artFirstMatch[1],
            referenceType: "article",
            jurisdiction: "CH",
          };
        }
      }

      const lawFirstArtMatch = normalized.match(lawFirstArticlePattern);
      if (lawFirstArtMatch) {
        const lawCode = lawFirstArtMatch[1].toUpperCase();
        if (swissFedlexLawCodeSet.has(lawCode)) {
          return {
            lawCode,
            section: lawFirstArtMatch[2],
            referenceType: "article",
            jurisdiction: "CH",
          };
        }
      }
    }
  }

  return null;
}

export function parseLawReference(input: string): ParsedLawReference | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const atLawFirstMatch = normalized.match(atLawFirstPattern);
  if (atLawFirstMatch) {
    return {
      lawCode: atLawFirstMatch[1].toUpperCase(),
      section: atLawFirstMatch[2],
      jurisdiction: "AT",
    };
  }

  const atSectionFirstMatch = normalized.match(atSectionFirstPattern);
  if (atSectionFirstMatch) {
    return {
      lawCode: atSectionFirstMatch[2].toUpperCase(),
      section: atSectionFirstMatch[1],
      jurisdiction: "AT",
    };
  }

  const atLawLastMatch = normalized.match(atLawLastPattern);
  if (atLawLastMatch) {
    return {
      lawCode: atLawLastMatch[2].toUpperCase(),
      section: atLawLastMatch[1],
      jurisdiction: "AT",
    };
  }

  const atLawMiddleMatch = normalized.match(atLawMiddlePattern);
  if (atLawMiddleMatch) {
    return {
      lawCode: atLawMiddleMatch[1].toUpperCase(),
      section: atLawMiddleMatch[2],
      jurisdiction: "AT",
    };
  }

  const atArticleFirstMatch = normalized.match(atArticleFirstPattern);
  if (atArticleFirstMatch) {
    return {
      lawCode: atArticleFirstMatch[2].toUpperCase(),
      section: atArticleFirstMatch[1],
      referenceType: "article",
      jurisdiction: "AT",
    };
  }

  const atLawFirstArticleMatch = normalized.match(atLawFirstArticlePattern);
  if (atLawFirstArticleMatch) {
    return {
      lawCode: atLawFirstArticleMatch[1].toUpperCase(),
      section: atLawFirstArticleMatch[2],
      referenceType: "article",
      jurisdiction: "AT",
    };
  }

  const atArticleLawLastMatch = normalized.match(atArticleLawLastPattern);
  if (atArticleLawLastMatch) {
    return {
      lawCode: atArticleLawLastMatch[2].toUpperCase(),
      section: atArticleLawLastMatch[1],
      referenceType: "article",
      jurisdiction: "AT",
    };
  }

  const atLawArticleMiddleMatch = normalized.match(atLawArticleMiddlePattern);
  if (atLawArticleMiddleMatch) {
    return {
      lawCode: atLawArticleMiddleMatch[1].toUpperCase(),
      section: atLawArticleMiddleMatch[2],
      referenceType: "article",
      jurisdiction: "AT",
    };
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

  const explicitSlashLawFirstMatch = normalized.match(explicitSlashLawFirstPattern);
  if (explicitSlashLawFirstMatch) {
    return {
      lawCode: explicitSlashLawFirstMatch[1].toUpperCase(),
      section: explicitSlashLawFirstMatch[2],
    };
  }

  const explicitSlashSectionFirstMatch = normalized.match(explicitSlashSectionFirstPattern);
  if (explicitSlashSectionFirstMatch) {
    return {
      lawCode: explicitSlashSectionFirstMatch[2].toUpperCase(),
      section: explicitSlashSectionFirstMatch[1],
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
