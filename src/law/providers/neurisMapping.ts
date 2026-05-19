import type { LawReference, LawSection } from "../types";

export interface NeurisCollection<T> {
  member: Array<{ item: T }>;
}

export interface NeurisLegislationObject {
  contentUrl?: string;
  encodingFormat?: string;
}

export interface NeurisLegislationPart {
  eId: string;
  name: string;
  headline?: string;
  temporalCoverage?: string | null;
  hasPart?: NeurisLegislationPart[];
}

export interface NeurisLegislationExpression {
  "@id": string;
  name: string;
  abbreviation?: string | null;
  alternateName?: string | null;
  legislationIdentifier: string;
  temporalCoverage?: string | null;
  hasPart?: NeurisLegislationPart[];
  encoding?: NeurisLegislationObject[];
}

export function selectLegislationByExactAbbreviation(
  collection: NeurisCollection<NeurisLegislationExpression>,
  lawCode: string,
): NeurisLegislationExpression | null {
  const normalizedLawCode = lawCode.toUpperCase();

  return (
    collection.member
      .map((member) => member.item)
      .find((item) => item.abbreviation?.toUpperCase() === normalizedLawCode) ?? null
  );
}

export function findSectionPart(
  parts: NeurisLegislationPart[] | undefined,
  sectionName: string,
): NeurisLegislationPart | null {
  if (!parts) {
    return null;
  }

  for (const part of parts) {
    if (part.name === sectionName) {
      return part;
    }

    const childMatch = findSectionPart(part.hasPart, sectionName);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

export function sectionNameFromReference(reference: LawReference): string {
  return `§ ${reference.section}`;
}

export function buildArticleHtmlUrl(
  expression: NeurisLegislationExpression,
  sectionPart: NeurisLegislationPart,
  baseUrl: string,
): string | null {
  const htmlManifestation = expression.encoding?.find(
    (encoding) =>
      encoding.encodingFormat === "text/html" &&
      typeof encoding.contentUrl === "string" &&
      encoding.contentUrl.endsWith(".html"),
  );

  if (!htmlManifestation?.contentUrl || !sectionPart.eId) {
    return null;
  }

  const manifestationPath = htmlManifestation.contentUrl.replace(/\.html$/, "");
  return new URL(`${manifestationPath}/${sectionPart.eId}.html`, baseUrl).toString();
}

export function extractPlainTextFromArticleHtml(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const withLineBreaks = body
    .replace(/<\/(h[1-6]|p|div|section|li|dt|dd|ol|ul)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  return decodeHtmlEntities(withLineBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function mapNeurisToLawSection(params: {
  expression: NeurisLegislationExpression;
  reference: LawReference;
  sectionPart: NeurisLegislationPart;
  articleHtml: string;
  articleUrl: string;
  providerId: string;
  providerLabel: string;
  retrievedAt: string;
}): LawSection {
  const temporalCoverage =
    params.sectionPart.temporalCoverage ?? params.expression.temporalCoverage ?? undefined;
  const [validFrom, validTo] = parseTemporalCoverage(temporalCoverage);

  return {
    providerId: params.providerId,
    providerLabel: params.providerLabel,
    sourceUrl: params.articleUrl,
    lawCode: params.expression.abbreviation ?? params.reference.lawCode,
    lawTitle: params.expression.name,
    section: params.reference.section,
    heading: params.sectionPart.headline,
    text: extractPlainTextFromArticleHtml(params.articleHtml),
    retrievedAt: params.retrievedAt,
    validFrom,
    validTo,
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: true,
  };
}

function parseTemporalCoverage(
  temporalCoverage: string | null | undefined,
): [string | undefined, string | undefined] {
  if (!temporalCoverage) {
    return [undefined, undefined];
  }

  const [from, to] = temporalCoverage.split("/");
  return [
    from || undefined,
    to && to !== ".." ? to : undefined,
  ];
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

