import { formatReferenceLabel } from "./referenceLabel";
import type { LawSection } from "./types";

interface CitationFormatterOptions {
  includeMetadataFooter?: boolean;
}

export function formatLawSectionAsMarkdown(
  section: LawSection,
  options: CitationFormatterOptions = {},
): string {
  const heading = section.heading ? ` – ${section.heading}` : "";
  const retrievedDate = section.retrievedAt.slice(0, 10);
  const includeMetadataFooter = options.includeMetadataFooter !== false;
  const referenceLabel = formatReferenceLabel(section);

  const lines = [
    `> **${referenceLabel} ${section.lawCode}${heading}**`,
    ">",
    ...section.text.split("\n").map((line) => `> ${line}`),
  ];

  if (includeMetadataFooter) {
    lines.push(
      "",
      `Quelle: ${section.providerLabel}, ${section.lawCode}, ${referenceLabel}, abgerufen am ${retrievedDate}.`,
      `Cache: ${section.cacheStatus}.`,
    );
  }

  return lines.join("\n");
}
