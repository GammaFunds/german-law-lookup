import { canonicalDisplayLawCode } from "../displayLawCode";
import type { LawReference, LawSection } from "../types";

const BASE_URL = "https://www.gesetze-im-internet.de";

const supportedLaws: Record<string, { path: string; lawTitle: string; displayLawCode?: string }> = {
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
  SGG: {
    path: "sgg",
    lawTitle: "Sozialgerichtsgesetz",
  },
  STGB: {
    path: "stgb",
    lawTitle: "Strafgesetzbuch",
    displayLawCode: "StGB",
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

export function buildGesetzeImInternetSectionUrl(
  reference: LawReference,
  baseUrl = BASE_URL,
): string | null {
  const law = supportedLaws[reference.lawCode.toUpperCase()];
  if (!law || !/^\d+[a-z]?$/i.test(reference.section)) {
    return null;
  }

  return new URL(
    `/${law.path}/__${reference.section.toLowerCase()}.html`,
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

  return {
    providerId: params.providerId,
    providerLabel: params.providerLabel,
    sourceUrl: params.sourceUrl,
    lawCode: displayLawCodeForReference(params.reference),
    lawTitle,
    section: params.reference.section,
    heading: extractGesetzeImInternetHeading(params.html),
    text: extractGesetzeImInternetPlainText(params.html),
    retrievedAt: params.retrievedAt,
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
  };
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
