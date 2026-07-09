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
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!headingMatch) {
    return undefined;
  }

  const withBreaks = headingMatch[1]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/[^>]+>/g, "\n");

  const lines = withBreaks
    .split("\n")
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const headingMatch = line.match(
      /^(?:§\.?\s*\d+[a-z]?(?:\.?\s*Paragraph\s*\d+,?)?|Art(?:ikel)?\.?\s*\d+[a-z]?)\s+(.+)$/i,
    );
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      if (heading.length > 0) {
        return heading;
      }
    }
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine && !/^(?:§\.?\s*\d+|Art(?:ikel)?\.?\s*\d+)/i.test(lastLine)) {
    return lastLine;
  }

  return undefined;
}

export function extractRisPlainText(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;

  const tabContent = findRisTabContent(body);
  const content = tabContent ?? body;

  const withLineBreaks = content
    .replace(/<\/(h[1-6]|p|div|section|li|dt|dd|ol|ul|table|tr|td|th)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const text = stripTags(withLineBreaks)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      const upper = line.toUpperCase();
      if (upper.startsWith("BUNDESRECHT KONSOLIDIERT")) return false;
      if (upper.startsWith("INFORMATION ZUM DOKUMENT")) return false;
      if (upper.startsWith("GESETZESNUMMER:")) return false;
      if (upper.startsWith("DOKUMENTNUMMER:")) return false;
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
      if (/^Paragraph\s*\d+[,.]?\s*$/i.test(line)) return false;
      return line.length > 0;
    });

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