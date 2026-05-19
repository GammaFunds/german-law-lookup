import type { LawReference, LawSection } from "../types";

const BASE_URL = "https://www.gesetze-im-internet.de";

const supportedLaws: Record<string, { path: string; lawTitle: string }> = {
  BGB: {
    path: "bgb",
    lawTitle: "Bürgerliches Gesetzbuch",
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
    lawCode: params.reference.lawCode,
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
  const lawContentMatch = html.match(/<div\b[^>]*class=["']jnhtml["'][^>]*>([\s\S]*?)(?:<div\b[^>]*class=["']jnfussnote["']|<\/body>)/i);
  if (lawContentMatch) {
    return lawContentMatch[1];
  }

  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
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
