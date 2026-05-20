import type { LawReference, LawSection } from "../types";

const BASE_URL = "https://www.gesetze-im-internet.de";

const supportedLaws: Record<string, { path: string; lawTitle: string }> = {
  BGB: {
    path: "bgb",
    lawTitle: "Bürgerliches Gesetzbuch",
  },
  STGB: {
    path: "stgb",
    lawTitle: "Strafgesetzbuch",
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
