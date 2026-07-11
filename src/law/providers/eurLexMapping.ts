import { euLanguageToEliCode, isEuLawLanguage } from "../euLanguages";
import type { LawReference } from "../types";

export const EUR_LEX_DSGVO_CELEX = "32016R0679";
export const EUR_LEX_DSGVO_ELI_PATH = "reg/2016/679/oj";
export const EUR_LEX_DSGVO_ALIASES = ["DSGVO", "GDPR", "RGPD", "RODO"] as const;

export const EUR_LEX_DSGVO_CELLAR_URL = `https://publications.europa.eu/resource/celex/${EUR_LEX_DSGVO_CELEX}`;

export function buildEurLexFetchRequest(reference: LawReference): {
  url: string;
  headers: Record<string, string>;
} | null {
  if (!canMapEurLexReference(reference)) return null;
  return {
    url: EUR_LEX_DSGVO_CELLAR_URL,
    headers: {
      Accept: "application/xhtml+xml",
      "Accept-Language": euLanguageToEliCode(reference.language!),
      "Accept-Max-Cs-Size": "8388608",
    },
  };
}

export function canMapEurLexReference(reference: LawReference): boolean {
  return reference.jurisdiction === "EU" && reference.lawCode.toUpperCase() === "DSGVO"
    && reference.referenceType === "article" && isEuLawLanguage(reference.language);
}

export function buildEurLexSectionUrl(reference: LawReference): string | null {
  if (!canMapEurLexReference(reference)) return null;
  return `https://eur-lex.europa.eu/eli/${EUR_LEX_DSGVO_ELI_PATH}/${euLanguageToEliCode(reference.language!)}/html`;
}
