import { formatReferenceLabel } from "../law/referenceLabel";
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
  const referenceLabel = formatReferenceLabel(section);
  const metadataLines = includeMetadataFooter
    ? [
        `Quelle: ${section.providerLabel}, ${section.lawCode}, ${referenceLabel}, abgerufen am ${section.retrievedAt.slice(0, 10)}.`,
        `Cache: ${section.cacheStatus}.`,
      ]
    : [];

  return {
    title: `${referenceLabel} ${section.lawCode}${heading}`,
    paragraphs: section.text.split("\n"),
    metadataLines,
  };
}
