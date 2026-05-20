import type { LawSection } from "../law/types";

interface LawSectionPreviewOptions {
  includeMetadataFooter?: boolean;
}

export interface LawSectionPreviewModel {
  title: string;
  paragraphs: string[];
  metadataLines: string[];
}

export function buildLawSectionPreviewModel(
  section: LawSection,
  options: LawSectionPreviewOptions = {},
): LawSectionPreviewModel {
  const heading = section.heading ? ` – ${section.heading}` : "";
  const includeMetadataFooter = options.includeMetadataFooter !== false;
  const metadataLines = includeMetadataFooter
    ? [
        `Quelle: ${section.providerLabel}, ${section.lawCode}, § ${section.section}, abgerufen am ${section.retrievedAt.slice(0, 10)}.`,
        `Cache: ${section.cacheStatus}.`,
      ]
    : [];

  return {
    title: `§ ${section.section} ${section.lawCode}${heading}`,
    paragraphs: section.text.split("\n"),
    metadataLines,
  };
}
