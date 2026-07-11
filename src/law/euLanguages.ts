import type { EuLawLanguage } from "./types";

export interface EuLanguageDefinition {
  code: EuLawLanguage;
  eliCode: string;
  nativeName: string;
}

export const EU_LANGUAGES: readonly EuLanguageDefinition[] = [
  ["bg", "bul", "Български"], ["es", "spa", "Español"], ["cs", "ces", "Čeština"], ["da", "dan", "Dansk"],
  ["de", "deu", "Deutsch"], ["et", "est", "Eesti"], ["el", "ell", "Ελληνικά"], ["en", "eng", "English"],
  ["fr", "fra", "Français"], ["ga", "gle", "Gaeilge"], ["hr", "hrv", "Hrvatski"], ["it", "ita", "Italiano"],
  ["lv", "lav", "Latviešu"], ["lt", "lit", "Lietuvių"], ["hu", "hun", "Magyar"], ["mt", "mlt", "Malti"],
  ["nl", "nld", "Nederlands"], ["pl", "pol", "Polski"], ["pt", "por", "Português"], ["ro", "ron", "Română"],
  ["sk", "slk", "Slovenčina"], ["sl", "slv", "Slovenščina"], ["fi", "fin", "Suomi"], ["sv", "swe", "Svenska"],
].map(([code, eliCode, nativeName]) => ({ code: code as EuLawLanguage, eliCode, nativeName }));

const byCode = new Map(EU_LANGUAGES.map((language) => [language.code, language]));
if (byCode.size !== 24 || new Set(EU_LANGUAGES.map((language) => language.eliCode)).size !== 24) {
  throw new Error("EU language registry must contain unique codes and ELI codes.");
}

export function isEuLawLanguage(value: unknown): value is EuLawLanguage {
  return typeof value === "string" && byCode.has(value as EuLawLanguage);
}

export function euLanguageToEliCode(language: EuLawLanguage): string {
  return byCode.get(language)!.eliCode;
}

export function euLanguageNativeName(language: EuLawLanguage): string {
  return byCode.get(language)!.nativeName;
}

export function defaultEuLawLanguage(locale: unknown, storedValue?: unknown): EuLawLanguage {
  if (isEuLawLanguage(storedValue)) return storedValue;
  const primary = typeof locale === "string" ? locale.toLowerCase().split(/[-_]/)[0] : "";
  return isEuLawLanguage(primary) ? primary : "de";
}
