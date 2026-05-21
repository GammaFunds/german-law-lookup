import { normalizeReferenceType } from "../referenceLabel";
import { canonicalDisplayLawCode } from "../displayLawCode";
import type { LawReference, LawSection } from "../types";

const BASE_URL = "https://www.gesetze-im-internet.de";

const supportedLaws: Record<string, {
  path: string;
  lawTitle: string;
  displayLawCode?: string;
  referenceType?: "section" | "article";
  exampleSection?: string;
  exampleInputs?: string[];
}> = {
  AO: {
    path: "ao_1977",
    lawTitle: "Abgabenordnung",
  },
  AKTG: {
    path: "aktg",
    lawTitle: "Aktiengesetz",
    displayLawCode: "AktG",
  },
  ARBGG: {
    path: "arbgg",
    lawTitle: "Arbeitsgerichtsgesetz",
    displayLawCode: "ArbGG",
  },
  ASYLG: {
    path: "asylvfg_1992",
    lawTitle: "Asylgesetz",
    displayLawCode: "AsylG",
  },
  AUFENTHG: {
    path: "aufenthg_2004",
    lawTitle: "Aufenthaltsgesetz",
    displayLawCode: "AufenthG",
  },
  BGB: {
    path: "bgb",
    lawTitle: "Bürgerliches Gesetzbuch",
    exampleSection: "823",
  },
  BETRVG: {
    path: "betrvg",
    lawTitle: "Betriebsverfassungsgesetz",
    displayLawCode: "BetrVG",
  },
  BURLG: {
    path: "burlg",
    lawTitle: "Bundesurlaubsgesetz",
    displayLawCode: "BUrlG",
  },
  ESTG: {
    path: "estg",
    lawTitle: "Einkommensteuergesetz",
    displayLawCode: "EStG",
  },
  EGBGB: {
    path: "bgbeg",
    lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
    displayLawCode: "EGBGB",
    referenceType: "article",
    exampleInputs: [
      "Art. 1 EGBGB",
      "EGBGB Art. 1",
      "Art. 229 § 6 EGBGB",
      "EGBGB Artikel 246a § 1",
    ],
  },
  FAMFG: {
    path: "famfg",
    lawTitle: "Gesetz über das Verfahren in Familiensachen und in den Angelegenheiten der freiwilligen Gerichtsbarkeit",
    displayLawCode: "FamFG",
  },
  FGO: {
    path: "fgo",
    lawTitle: "Finanzgerichtsordnung",
  },
  GEWSTG: {
    path: "gewstg",
    lawTitle: "Gewerbesteuergesetz",
    displayLawCode: "GewStG",
  },
  GG: {
    path: "gg",
    lawTitle: "Grundgesetz für die Bundesrepublik Deutschland",
    referenceType: "article",
    exampleSection: "1",
  },
  GMBHG: {
    path: "gmbhg",
    lawTitle: "Gesetz betreffend die Gesellschaften mit beschränkter Haftung",
    displayLawCode: "GmbHG",
  },
  GVG: {
    path: "gvg",
    lawTitle: "Gerichtsverfassungsgesetz",
  },
  GWG: {
    path: "gwg_2017",
    lawTitle: "Geldwäschegesetz",
    displayLawCode: "GwG",
  },
  HGB: {
    path: "hgb",
    lawTitle: "Handelsgesetzbuch",
  },
  INSO: {
    path: "inso",
    lawTitle: "Insolvenzordnung",
    displayLawCode: "InsO",
  },
  JGG: {
    path: "jgg",
    lawTitle: "Jugendgerichtsgesetz",
  },
  KAGB: {
    path: "kagb",
    lawTitle: "Kapitalanlagegesetzbuch",
  },
  KSCHG: {
    path: "kschg",
    lawTitle: "Kündigungsschutzgesetz",
    displayLawCode: "KSchG",
  },
  KSTG: {
    path: "kstg_1977",
    lawTitle: "Körperschaftsteuergesetz",
    displayLawCode: "KStG",
  },
  PAUSWG: {
    path: "pauswg",
    lawTitle: "Personalausweisgesetz",
    displayLawCode: "PAuswG",
  },
  "SGB I": {
    path: "sgb_1",
    lawTitle: "Sozialgesetzbuch (SGB) Erstes Buch (I) - Allgemeiner Teil",
    displayLawCode: "SGB I",
  },
  "SGB II": {
    path: "sgb_2",
    lawTitle: "Sozialgesetzbuch (SGB) Zweites Buch (II) - Bürgergeld, Grundsicherung für Arbeitsuchende",
    displayLawCode: "SGB II",
  },
  "SGB III": {
    path: "sgb_3",
    lawTitle: "Sozialgesetzbuch (SGB) Drittes Buch (III) - Arbeitsförderung",
    displayLawCode: "SGB III",
  },
  "SGB IV": {
    path: "sgb_4",
    lawTitle: "Sozialgesetzbuch (SGB) Viertes Buch (IV) - Gemeinsame Vorschriften für die Sozialversicherung",
    displayLawCode: "SGB IV",
  },
  SGG: {
    path: "sgg",
    lawTitle: "Sozialgerichtsgesetz",
  },
  "SGB V": {
    path: "sgb_5",
    lawTitle: "Sozialgesetzbuch (SGB) Fünftes Buch (V) - Gesetzliche Krankenversicherung",
    displayLawCode: "SGB V",
  },
  "SGB VI": {
    path: "sgb_6",
    lawTitle: "Sozialgesetzbuch (SGB) Sechstes Buch (VI) - Gesetzliche Rentenversicherung",
    displayLawCode: "SGB VI",
  },
  "SGB VII": {
    path: "sgb_7",
    lawTitle: "Siebtes Buch Sozialgesetzbuch - Gesetzliche Unfallversicherung",
    displayLawCode: "SGB VII",
  },
  "SGB VIII": {
    path: "sgb_8",
    lawTitle: "Sozialgesetzbuch (SGB) Achtes Buch (VIII) - Kinder- und Jugendhilfe",
    displayLawCode: "SGB VIII",
  },
  "SGB IX": {
    path: "sgb_9_2018",
    lawTitle: "Sozialgesetzbuch (SGB) Neuntes Buch (IX) - Rehabilitation und Teilhabe von Menschen mit Behinderungen",
    displayLawCode: "SGB IX",
  },
  "SGB X": {
    path: "sgb_10",
    lawTitle: "Zehntes Buch Sozialgesetzbuch - Sozialverwaltungsverfahren und Sozialdatenschutz",
    displayLawCode: "SGB X",
  },
  "SGB XI": {
    path: "sgb_11",
    lawTitle: "Sozialgesetzbuch (SGB) Elftes Buch (XI) - Soziale Pflegeversicherung",
    displayLawCode: "SGB XI",
  },
  "SGB XII": {
    path: "sgb_12",
    lawTitle: "Sozialgesetzbuch (SGB) Zwölftes Buch (XII) - Sozialhilfe",
    displayLawCode: "SGB XII",
  },
  "SGB XIV": {
    path: "sgb_14",
    lawTitle: "Sozialgesetzbuch Vierzehntes Buch - Soziale Entschädigung",
    displayLawCode: "SGB XIV",
  },
  STGB: {
    path: "stgb",
    lawTitle: "Strafgesetzbuch",
    displayLawCode: "StGB",
    exampleSection: "242",
  },
  STAG: {
    path: "stag",
    lawTitle: "Staatsangehörigkeitsgesetz",
    displayLawCode: "StAG",
  },
  STPO: {
    path: "stpo",
    lawTitle: "Strafprozeßordnung",
    displayLawCode: "StPO",
  },
  TZBFG: {
    path: "tzbfg",
    lawTitle: "Teilzeit- und Befristungsgesetz",
    displayLawCode: "TzBfG",
  },
  UMWG: {
    path: "umwg_1995",
    lawTitle: "Umwandlungsgesetz",
    displayLawCode: "UmwG",
  },
  USTG: {
    path: "ustg_1980",
    lawTitle: "Umsatzsteuergesetz",
    displayLawCode: "UStG",
  },
  VWGO: {
    path: "vwgo",
    lawTitle: "Verwaltungsgerichtsordnung",
    displayLawCode: "VwGO",
  },
  VWVFG: {
    path: "vwvfg",
    lawTitle: "Verwaltungsverfahrensgesetz",
    displayLawCode: "VwVfG",
  },
  WPHG: {
    path: "wphg",
    lawTitle: "Wertpapierhandelsgesetz",
    displayLawCode: "WpHG",
  },
  ZPO: {
    path: "zpo",
    lawTitle: "Zivilprozessordnung",
  },
  ZVG: {
    path: "zvg",
    lawTitle: "Gesetz über die Zwangsversteigerung und die Zwangsverwaltung",
  },
};

export interface SupportedGesetzeImInternetLaw {
  displayLawCode: string;
  lawTitle: string;
  referenceType: "section" | "article";
  exampleInputs: string[];
}

export function getSupportedGesetzeImInternetLaws(): SupportedGesetzeImInternetLaw[] {
  return Object.entries(supportedLaws)
    .map(([lawCode, law]) => {
      const displayLawCode = law.displayLawCode ?? canonicalDisplayLawCode(lawCode);
      const referenceType = law.referenceType ?? "section";
      const exampleSection = law.exampleSection ?? "1";

      return {
        displayLawCode,
        lawTitle: law.lawTitle,
        referenceType,
        exampleInputs:
          law.exampleInputs
          ?? (referenceType === "article"
            ? [
                `Art. ${exampleSection} ${displayLawCode}`,
                `${displayLawCode} Art. ${exampleSection}`,
                `Artikel ${exampleSection} ${displayLawCode}`,
                `${displayLawCode} Artikel ${exampleSection}`,
              ]
            : [
                `§ ${exampleSection} ${displayLawCode}`,
                `${displayLawCode} § ${exampleSection}`,
                `${exampleSection} ${displayLawCode}`,
                `${displayLawCode} ${exampleSection}`,
              ]),
      };
    })
    .sort((left, right) => left.displayLawCode.localeCompare(right.displayLawCode, "de"));
}

export function buildGesetzeImInternetSectionUrl(
  reference: LawReference,
  baseUrl = BASE_URL,
): string | null {
  const law = supportedLaws[reference.lawCode.toUpperCase()];
  const referenceType = normalizeReferenceType(reference.referenceType);
  if (!law || !/^\d+[a-z]?$/i.test(reference.section)) {
    return null;
  }

  if (reference.lawCode.toUpperCase() === "EGBGB") {
    const subsection = reference.subsection?.trim();
    if (referenceType !== "article") {
      return null;
    }

    const article = reference.section.toLowerCase();
    if (!subsection) {
      return new URL(`/${law.path}/BJNR006049896.html`, baseUrl).toString();
    }

    if (!/^\d+[a-z]?$/i.test(subsection)) {
      return null;
    }

    const normalizedSubsection = subsection.toLowerCase();
    return new URL(`/${law.path}/art_${article}__${normalizedSubsection}.html`, baseUrl).toString();
  }

  const supportedReferenceType = law.referenceType ?? "section";
  if (referenceType !== supportedReferenceType) {
    return null;
  }

  const suffix = reference.section.toLowerCase();
  const path =
    referenceType === "article"
      ? `/${law.path}/art_${suffix}.html`
      : `/${law.path}/__${suffix}.html`;

  return new URL(
    path,
    baseUrl,
  ).toString();
}

export function lawTitleForReference(reference: LawReference): string | null {
  return supportedLaws[reference.lawCode.toUpperCase()]?.lawTitle ?? null;
}

function displayLawCodeForReference(reference: LawReference): string {
  return supportedLaws[reference.lawCode.toUpperCase()]?.displayLawCode
    ?? canonicalDisplayLawCode(reference.lawCode);
}

export function extractGesetzeImInternetHeading(html: string): string | undefined {
  const headingMatch = html.match(/<span\b[^>]*class=["']jnentitel["'][^>]*>([\s\S]*?)<\/span>/i);
  return headingMatch ? normalizeText(stripTags(headingMatch[1])) : undefined;
}

export function extractGesetzeImInternetPlainText(html: string): string {
  const content = extractMainLawContent(html);
  const withLineBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(h[1-6]|p|div|li|dt|dd|dl)>/gi, "\n");

  return normalizeText(stripTags(withLineBreaks));
}

export function canMapGesetzeImInternetReference(reference: LawReference, html: string): boolean {
  return htmlForReference(reference, html) !== null;
}

export function mapGesetzeImInternetToLawSection(params: {
  reference: LawReference;
  html: string;
  sourceUrl: string;
  providerId: string;
  providerLabel: string;
  retrievedAt: string;
}): LawSection {
  const lawTitle = lawTitleForReference(params.reference);
  if (!lawTitle) {
    throw new Error(`Unsupported law code: ${params.reference.lawCode}`);
  }

  const referenceHtml = htmlForReference(params.reference, params.html) ?? params.html;

  return {
    providerId: params.providerId,
    providerLabel: params.providerLabel,
    sourceUrl: params.sourceUrl,
    lawCode: displayLawCodeForReference(params.reference),
    lawTitle,
    section: params.reference.section,
    referenceType: normalizeReferenceType(params.reference.referenceType),
    subsection: params.reference.subsection,
    heading: extractGesetzeImInternetHeading(referenceHtml),
    text: extractGesetzeImInternetPlainText(referenceHtml),
    retrievedAt: params.retrievedAt,
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
  };
}

function htmlForReference(reference: LawReference, html: string): string | null {
  if (isEgbgbPureArticleReference(reference)) {
    return extractEgbgbPureArticleHtml(html, reference.section);
  }

  return html;
}

function isEgbgbPureArticleReference(reference: LawReference): boolean {
  return reference.lawCode.toUpperCase() === "EGBGB"
    && normalizeReferenceType(reference.referenceType) === "article"
    && !reference.subsection;
}

function extractEgbgbPureArticleHtml(html: string, article: string): string | null {
  const normalizedArticle = article.trim().toLowerCase();

  for (const normHtml of findElementContentsByClass(html, "jnnorm")) {
    const headerMatch = normHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (!headerMatch) {
      continue;
    }

    const firstHeaderSpan = headerMatch[1].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const headerText = normalizeText(stripTags(firstHeaderSpan ?? headerMatch[1])).toLowerCase();
    if (headerText === `art ${normalizedArticle}`) {
      return normHtml;
    }
  }

  return null;
}

function extractMainLawContent(html: string): string {
  const sanitizedHtml = removeNonContentBlocks(html);
  const lawContent = findFirstElementContentByClass(sanitizedHtml, "jnhtml");
  if (lawContent) {
    const paragraphBlocks = findElementContentsByClass(lawContent, "jurAbsatz");
    return paragraphBlocks.length > 0 ? paragraphBlocks.join("\n") : lawContent;
  }

  return sanitizedHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? sanitizedHtml;
}

function removeNonContentBlocks(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

function findFirstElementContentByClass(html: string, className: string): string | null {
  return findElementContentsByClass(html, className)[0] ?? null;
}

function findElementContentsByClass(html: string, className: string): string[] {
  const contents: string[] = [];
  const openingTagPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;

  for (const match of html.matchAll(openingTagPattern)) {
    const tag = match[1];
    const openingTag = match[0];
    const classAttribute = openingTag.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!classAttribute?.split(/\s+/).includes(className)) {
      continue;
    }

    const openingEnd = match.index + openingTag.length;
    const elementEnd = findElementEnd(html, tag, openingEnd);
    if (elementEnd !== null) {
      contents.push(html.slice(openingEnd, elementEnd));
    }
  }

  return contents;
}

function findElementEnd(html: string, tag: string, openingEnd: number): number | null {
  const tagPattern = new RegExp(`<\\/?${escapeRegExp(tag)}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = openingEnd;
  let depth = 1;

  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return match.index;
      }
      continue;
    }

    if (!token.endsWith("/>")) {
      depth += 1;
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function normalizeText(value: string): string {
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }

    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }

    const namedEntities: Record<string, string> = {
      amp: "&",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: '"',
      szlig: "ß",
      auml: "ä",
      Auml: "Ä",
      ouml: "ö",
      Ouml: "Ö",
      uuml: "ü",
      Uuml: "Ü",
    };

    return namedEntities[code] ?? entity;
  });
}
