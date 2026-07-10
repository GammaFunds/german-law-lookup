import type { LawReference, LawSection } from "../types";

const FEDLEX_BASE_URL = "https://www.fedlex.admin.ch";

interface SwissLawConfig {
  workUri: string;
  lawTitle: string;
  displayLawCode: string;
}

const supportedSwissLaws: Record<string, SwissLawConfig> = {
  BV: {
    workUri: "https://fedlex.data.admin.ch/eli/cc/1999/404",
    lawTitle: "Bundesverfassung der Schweizerischen Eidgenossenschaft",
    displayLawCode: "BV",
  },
  ZGB: {
    workUri: "https://fedlex.data.admin.ch/eli/cc/24/233_245_233",
    lawTitle: "Zivilgesetzbuch",
    displayLawCode: "ZGB",
  },
};

export interface FedlexMapResult {
  workUri: string;
  articleNumber: string;
}

export function mapFedlexReference(
  reference: LawReference,
): FedlexMapResult | null {
  if (reference.jurisdiction !== "CH") {
    return null;
  }

  const law = supportedSwissLaws[reference.lawCode.toUpperCase()];
  if (!law) {
    return null;
  }

  if (reference.referenceType === "section") {
    return null;
  }

  return {
    workUri: law.workUri,
    articleNumber: reference.section,
  };
}

export function buildFedlexQueryBody(
  workUri: string,
  articleNumber: string,
): unknown {
  return {
    query: {
      bool: {
        must: [
          { term: { "contentParent.keyword": workUri } },
          {
            nested: {
              path: "deContent",
              query: {
                term: {
                  "deContent.id.keyword": `art_${articleNumber}`,
                },
              },
              inner_hits: { _source: true },
            },
          },
        ],
      },
    },
  };
}

export interface FedlexArticleData {
  id: string;
  title?: string;
  content?: string;
  order?: number;
  itemUri?: string;
}

export function extractFedlexArticleFromResponse(
  responseJson: unknown,
): FedlexArticleData | null {
  const root = responseJson as FedlexSearchResponse;
  const outerHits = root?.hits?.hits;
  if (!outerHits || outerHits.length === 0) {
    return null;
  }

  const inner = outerHits[0]?.inner_hits?.deContent?.hits?.hits;
  if (!inner || inner.length === 0) {
    return null;
  }

  const source = inner[0]._source;
  if (!source || !source.id) {
    return null;
  }

  return {
    id: source.id,
    title: source.title,
    content: source.content,
    order: source.order,
    itemUri: source.itemUri,
  };
}

export function normalizeFedlexHeading(
  heading: string | undefined,
  sectionNumber?: string,
): string | undefined {
  if (!heading) {
    return undefined;
  }

  // Convert HTML to plain text first
  let text = convertFedlexHtmlToText(heading);

  if (!text) {
    return undefined;
  }

  // Remove leading article label like "Art. 8", "Art 8", "Artikel 8"
  if (sectionNumber) {
    // Escape special regex characters in sectionNumber
    const escapedSection = sectionNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `^(?:Art\\.?\\s*${escapedSection}|Artikel\\s+${escapedSection})(?:\\s+|$)`,
      "i",
    );
    text = text.replace(pattern, "").trim();
  }

  // Also try without section number for generic "Art." prefix
  text = text.replace(/^Art\.?\s+\d+(?:\s+|$)/, "").trim();

  if (!text) {
    return undefined;
  }

  return text;
}

export function convertFedlexHtmlToText(html: string | undefined): string {
  if (!html) {
    return "";
  }

  let text = html;

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Remove script, style, noscript blocks and their contents
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Handle dl/dt/dd structures: <dl><dt>a.</dt><dd>Text</dd></dl>
  text = text.replace(/<dt>/gi, "\n");
  text = text.replace(/<\/dt>/gi, "");
  text = text.replace(/<dd>/gi, " ");
  text = text.replace(/<\/dd>/gi, "\n");

  // Add readable boundaries for block elements
  text = text
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/section>/gi, "\n")
    .replace(/<\/article>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/th>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n");

  // Preserve sup paragraph numbers
  text = text.replace(/<sup[^>]*>/gi, "").replace(/<\/sup>/gi, "");

  // Decode common HTML entities and non-breaking spaces
  text = decodeHtmlEntities(text);

  // Remove any remaining raw tags
  text = text.replace(/<[^>]+>/g, "");

  // Collapse excessive whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (entity, token: string) => {
      if (token.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
      }

      if (token.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
      }

      const named: Record<string, string> = {
        amp: "&",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
        apos: "'",
        sect: "§",
        szlig: "ß",
        auml: "ä",
        Auml: "Ä",
        ouml: "ö",
        Ouml: "Ö",
        uuml: "ü",
        Uuml: "Ü",
      };

      return named[token] ?? entity;
    },
  );
}

export function mapFedlexToLawSection(params: {
  reference: LawReference;
  articleData: FedlexArticleData;
  providerId: string;
  providerLabel: string;
  retrievedAt: string;
}): LawSection {
  const law =
    supportedSwissLaws[params.reference.lawCode.toUpperCase()];
  if (!law) {
    throw new Error(
      `Unsupported Swiss law code: ${params.reference.lawCode}`,
    );
  }

  return {
    providerId: params.providerId,
    providerLabel: params.providerLabel,
    sourceUrl: params.articleData.itemUri,
    lawCode: law.displayLawCode,
    lawTitle: law.lawTitle,
    section: params.reference.section,
    referenceType: "article",
    sourceVariant: "official-de",
    jurisdiction: "CH",
    heading: normalizeFedlexHeading(params.articleData.title, params.reference.section),
    text: convertFedlexHtmlToText(params.articleData.content),
    retrievedAt: params.retrievedAt,
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: true,
  };
}

interface FedlexSearchResponse {
  hits?: {
    hits?: Array<{
      _source?: Record<string, unknown>;
      inner_hits?: {
        deContent?: {
          hits?: {
            hits?: Array<{
              _source?: {
                id?: string;
                title?: string;
                content?: string;
                order?: number;
                itemUri?: string;
              };
            }>;
          };
        };
      };
    }>;
  };
}
