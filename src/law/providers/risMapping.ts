import type { LawReference, LawSection } from "../types";

const BASE_URL = "https://www.ris.bka.gv.at";

interface AustrianLawConfig {
  gesetzesnummer: string;
  lawTitle: string;
  displayLawCode: string;
  referenceType: "section" | "article";
}

const supportedAustrianLaws: Record<string, AustrianLawConfig> = {
  ABGB: {
    gesetzesnummer: "10001622",
    lawTitle: "Allgemeines bürgerliches Gesetzbuch",
    displayLawCode: "ABGB",
    referenceType: "section",
  },
  STGB: {
    gesetzesnummer: "10002296",
    lawTitle: "Strafgesetzbuch",
    displayLawCode: "StGB",
    referenceType: "section",
  },
  "B-VG": {
    gesetzesnummer: "10000138",
    lawTitle: "Bundes-Verfassungsgesetz",
    displayLawCode: "B-VG",
    referenceType: "article",
  },
  ZPO: {
    gesetzesnummer: "10001699",
    lawTitle: "Zivilprozessordnung",
    displayLawCode: "ZPO",
    referenceType: "section",
  },
  JN: {
    gesetzesnummer: "10001697",
    lawTitle: "Jurisdiktionsnorm",
    displayLawCode: "JN",
    referenceType: "section",
  },
  EO: {
    gesetzesnummer: "10001700",
    lawTitle: "Exekutionsordnung",
    displayLawCode: "EO",
    referenceType: "section",
  },
  UGB: {
    gesetzesnummer: "10001702",
    lawTitle: "Unternehmensgesetzbuch",
    displayLawCode: "UGB",
    referenceType: "section",
  },
  STPO: {
    gesetzesnummer: "10002326",
    lawTitle: "Strafprozeßordnung 1975",
    displayLawCode: "StPO",
    referenceType: "section",
  },
};

export function buildRisSectionUrl(reference: LawReference): string | null {
  if (reference.jurisdiction !== "AT") {
    return null;
  }

  const law = supportedAustrianLaws[reference.lawCode.toUpperCase()];
  if (!law) {
    return null;
  }

  if (law.referenceType === "article") {
    const url = new URL("/NormDokument.wxe", BASE_URL);
    url.searchParams.set("Abfrage", "Bundesnormen");
    url.searchParams.set("Gesetzesnummer", law.gesetzesnummer);
    url.searchParams.set("Artikel", reference.section);
    return url.toString();
  }

  const url = new URL("/NormDokument.wxe", BASE_URL);
  url.searchParams.set("Abfrage", "Bundesnormen");
  url.searchParams.set("Gesetzesnummer", law.gesetzesnummer);
  url.searchParams.set("Paragraf", reference.section);
  return url.toString();
}

export function extractRisHeading(html: string): string | undefined {
  const cleaned = stripRisClientCode(html);
  const heading = extractRisHeadingFromHeadingElement(cleaned);
  if (heading) {
    return heading;
  }

  const body = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;
  const tabContent = findRisTabContent(body);
  const regionLines = tabContent
    ? toRisTextLines(tabContent)
    : extractRisTextRegionFromLines(toRisTextLines(body));

  for (const line of regionLines.slice(0, 8)) {
    const parsed = parseRisHeadingLine(line);
    if (parsed) {
      return parsed;
    }
  }

  for (const line of regionLines.slice(0, 8)) {
    if (isLikelyRisHeadingCandidate(line)) {
      return line;
    }
  }

  return undefined;
}

export function extractRisPlainText(html: string): string {
  const cleaned = stripRisClientCode(html);
  const body = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleaned;

  const tabContent = findRisTabContent(body);
  const content = tabContent ?? body;

  const lines = toRisTextLines(content);
  const text = tabContent
    ? lines.filter(isRisPlainTextLine)
    : extractRisTextRegionFromLines(lines);

  return text.join("\n");
}

export function canMapRisReference(reference: LawReference, html: string): boolean {
  if (reference.jurisdiction !== "AT") {
    return false;
  }

  return supportedAustrianLaws[reference.lawCode.toUpperCase()] != null;
}

export function extractRisMetadata(html: string): { gesetzesnummer?: string; dokumentnummer?: string; zuletztAktualisiert?: string } {
  const meta: { gesetzesnummer?: string; dokumentnummer?: string; zuletztAktualisiert?: string } = {};
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;

  const gnMatch = body.match(/Gesetzesnummer:\s*([^\s<]+)/i);
  if (gnMatch) meta.gesetzesnummer = gnMatch[1].trim();

  const dnMatch = body.match(/Dokumentnummer:\s*([^\s<]+)/i);
  if (dnMatch) meta.dokumentnummer = dnMatch[1].trim();

  const zaMatch = body.match(/Zuletzt aktualisiert(?:\sam)?:\s*([^<]+)/i);
  if (zaMatch) meta.zuletztAktualisiert = zaMatch[1].trim();

  return meta;
}

export function mapRisToLawSection(params: {
  reference: LawReference;
  html: string;
  sourceUrl: string;
  providerId: string;
  providerLabel: string;
  retrievedAt: string;
}): LawSection {
  const law = supportedAustrianLaws[params.reference.lawCode.toUpperCase()];
  if (!law) {
    throw new Error(`Unsupported Austrian law code: ${params.reference.lawCode}`);
  }

  return {
    providerId: params.providerId,
    providerLabel: params.providerLabel,
    sourceUrl: params.sourceUrl,
    lawCode: law.displayLawCode,
    lawTitle: law.lawTitle,
    section: params.reference.section,
    referenceType: law.referenceType,
    sourceVariant: "official-de",
    jurisdiction: "AT",
    heading: extractRisHeading(params.html),
    text: extractRisPlainText(params.html),
    retrievedAt: params.retrievedAt,
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
  };
}


function extractRisHeadingFromHeadingElement(html: string): string | undefined {
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!headingMatch) {
    return undefined;
  }

  const lines = toRisTextLines(headingMatch[1]);

  for (let i = lines.length - 1; i >= 0; i--) {
    const heading = parseRisHeadingLine(lines[i]);
    if (heading) {
      return heading;
    }
  }

  const lastLine = lines[lines.length - 1];
  if (
    lastLine &&
    !/^(?:§\.?\s*\d+|Art(?:ikel)?\.?\s*\d+)/i.test(lastLine) &&
    !isGenericRisPageHeading(lastLine)
  ) {
    return lastLine;
  }

  return undefined;
}

function parseRisHeadingLine(line: string): string | undefined {
  const headingMatch = line.match(
    /^(?:§\.?\s*\d+[a-z]?(?:\.?\s*Paragraph\s*\d+,?)?|Art(?:ikel)?\.?\s*\d+[a-z]?)\s+(.+)$/i,
  );
  if (!headingMatch) {
    return undefined;
  }

  const heading = headingMatch[1].replace(/^[-–—:,\s]+/, "").trim();
  if (!heading || isGenericRisPageHeading(heading) || /^Paragraph\s*\d+/i.test(heading)) {
    return undefined;
  }

  return heading;
}

function stripRisClientCode(html: string): string {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n");
}

function toRisTextLines(html: string): string[] {
  const withLineBreaks = html
    .replace(/<\/(h[1-6]|p|div|section|li|dt|dd|ol|ul|table|tr|td|th)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  return decodeHtmlEntities(stripTags(withLineBreaks))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractRisTextRegionFromLines(lines: string[]): string[] {
  const textLabelIndex = lines.findIndex((line) => /^Text$/i.test(line));
  let startIndex = textLabelIndex >= 0 ? textLabelIndex + 1 : -1;

  if (startIndex < 0 || startIndex >= lines.length) {
    startIndex = lines.findIndex((line) =>
      /^(?:§|Art(?:ikel)?\.?)\s*\d+[a-z]?/i.test(line),
    );
  }

  if (startIndex < 0) {
    return lines.filter(isRisPlainTextLine);
  }

  const result: string[] = [];
  let sawNormContent = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (isRisTextStopLine(line)) {
      break;
    }

    if (shouldSkipRisFallbackLine(line)) {
      continue;
    }

    if (!sawNormContent && isLikelyRisStructureHeading(line)) {
      continue;
    }

    if (isRisParagraphMarkerLine(line)) {
      sawNormContent = true;
      continue;
    }

    result.push(line);
    sawNormContent = true;
  }

  return result.filter(isRisPlainTextLine);
}

function isRisPlainTextLine(line: string): boolean {
  const upper = line.toUpperCase();
  if (upper.startsWith("BUNDESRECHT KONSOLIDIERT")) return false;
  if (upper.startsWith("INFORMATION ZUM DOKUMENT")) return false;
  if (upper.startsWith("GESETZESNUMMER:")) return false;
  if (upper.startsWith("DOKUMENTNUMMER:")) return false;
  if (upper.startsWith("ALTE DOKUMENTNUMMER:")) return false;
  if (upper.startsWith("ZULETZT AKTUALISIERT AM:")) return false;
  if (upper.startsWith("ZULETZT AKTUALISIERT:")) return false;
  if (upper.includes("EUROPEAN LEGISLATION IDENTIFIER")) return false;
  if (upper.startsWith("PRÄAMBEL/PROMULGATIONSKLAUSEL")) return false;
  if (/^inhalt/i.test(line) && line.length < 30) return false;
  if (/^(§\s*\d+|artikel\s*\d+|art\.?\s*\d+)/i.test(line) && line.length < 60) return true;
  if (line.match(/^Seite\s+\d+\s+von/i)) return false;
  if (line.startsWith("Startseite")) return false;
  if (line.startsWith("RIS Dokument")) return false;
  if (line.startsWith("Datenschutz")) return false;
  if (line.startsWith("Barrierefreiheit")) return false;
  if (line.startsWith("Kontakt")) return false;
  if (isRisParagraphMarkerLine(line)) return false;
  if (shouldSkipRisFallbackLine(line)) return false;
  return line.length > 0;
}

function isRisTextStopLine(line: string): boolean {
  return (
    /^Schlagworte\b/i.test(line) ||
    /^Zuletzt aktualisiert\b/i.test(line) ||
    /^Gesetzesnummer\b/i.test(line) ||
    /^Dokumentnummer\b/i.test(line) ||
    /^Alte Dokumentnummer\b/i.test(line) ||
    /^European Legislation Identifier\b/i.test(line) ||
    /^https?:\/\/www\.ris\.bka\.gv\.at\/eli\b/i.test(line) ||
    /^Zum Seitenanfang\b/i.test(line) ||
    /^Über diese Seite\b/i.test(line) ||
    /^©\s*\d{4}/i.test(line) ||
    /Bundeskanzleramt der Republik Österreich/i.test(line)
  );
}

function shouldSkipRisFallbackLine(line: string): boolean {
  return (
    /^\/\//.test(line) ||
    /^['"`)]/.test(line) ||
    /\bSmartPage_Initialize\b/i.test(line) ||
    /\bSmartPage_Context\b/i.test(line) ||
    /\bStyleUtility\b/i.test(line) ||
    /\bBasePage_On\b/i.test(line) ||
    /\bWxePage_/i.test(line) ||
    /\beventHandlers\b/i.test(line) ||
    /\btrackedControls\b/i.test(line) ||
    /\bsynchronousPostBackCommands\b/i.test(line) ||
    /^Sie sind dabei, die Seite zu verlassen/i.test(line) ||
    /^Seitenbereiche:?$/i.test(line) ||
    /^Zum Inhalt\b/i.test(line) ||
    /^Zur Navigationsleiste\b/i.test(line) ||
    /^Navigationsleiste:?$/i.test(line) ||
    /^Impressum\b/i.test(line) ||
    /^Sitemap\b/i.test(line) ||
    /^English\b/i.test(line) ||
    /^Druckansicht\b/i.test(line) ||
    /^Gesamte Rechtsvorschrift\b/i.test(line) ||
    /^Alle Fassungen\b/i.test(line) ||
    /^Begleitende Dokumente\b/i.test(line) ||
    /^Hauptdokument\b/i.test(line) ||
    /^Kurztitel\b/i.test(line) ||
    /^Kundmachungsorgan\b/i.test(line) ||
    /^Typ\b/i.test(line) ||
    /^§\/Artikel\/Anlage\b/i.test(line) ||
    /^Inkrafttretensdatum\b/i.test(line) ||
    /^Außerkrafttretensdatum\b/i.test(line) ||
    /^Abkürzung\b/i.test(line) ||
    /^Index\b/i.test(line) ||
    /^Materialien\b/i.test(line) ||
    /^Rechtssätze\b/i.test(line) ||
    /^§\s*\d+\s+(?:am|heute|gültig)/i.test(line)
  );
}

function isRisParagraphMarkerLine(line: string): boolean {
  return (
    /^Paragraph\s*\d+[,.]?\s*$/i.test(line) ||
    /^(?:§|Art(?:ikel)?\.?)\s*\d+[a-z]?\s*(?:\.?\s*Paragraph\s*\d+,?)?\s*[,.;:]?\s*$/i.test(line)
  );
}

function isLikelyRisStructureHeading(line: string): boolean {
  return (
    /^(?:Allgemeiner|Besonderer)\s+Teil$/i.test(line) ||
    /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+\s+Abschnitt$/i.test(line) ||
    /^Strafbare Handlungen\b/i.test(line)
  );
}

function isLikelyRisHeadingCandidate(line: string): boolean {
  if (!line || isGenericRisPageHeading(line) || isRisParagraphMarkerLine(line)) {
    return false;
  }

  if (isRisTextStopLine(line) || shouldSkipRisFallbackLine(line) || isLikelyRisStructureHeading(line)) {
    return false;
  }

  return line.length <= 80 && line.split(/\s+/).length <= 8 && !/[.!?]$/.test(line);
}

function isGenericRisPageHeading(line: string): boolean {
  const normalized = line.replace(/\s+/g, " ").trim();
  return (
    /^Bundesrecht konsolidiert\b/i.test(normalized) ||
    /^[^-–—:]*\b(?:§|Art\.?|Artikel)\s*\d+[a-z]?\s*(?:,?\s*tagesaktuelle\s+Fassung)?$/i.test(normalized)
  );
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token) => {
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
  });
}


function findRisTabContent(html: string): string | null {
  const tabContentMatch = html.match(/<div[^>]*id=["']tabContent["'][^>]*>([\s\S]*?)<\/div>/i);
  if (tabContentMatch) {
    return tabContentMatch[1];
  }

  const tocMatch = html.match(/<div[^>]*class=["'][^"']*tocContent[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (tocMatch) {
    return tocMatch[1];
  }

  const docTextMatch = html.match(/<div[^>]*class=["'][^"']*docText[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (docTextMatch) {
    return docTextMatch[1];
  }

  return null;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}