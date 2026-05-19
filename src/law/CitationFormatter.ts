import type { LawSection } from "./types";

export function formatLawSectionAsMarkdown(section: LawSection): string {
  const heading = section.heading ? ` – ${section.heading}` : "";
  const retrievedDate = section.retrievedAt.slice(0, 10);

  return [
    `> **§ ${section.section} ${section.lawCode}${heading}**`,
    ">",
    ...section.text.split("\n").map((line) => `> ${line}`),
    "",
    `Quelle: ${section.providerLabel}, ${section.lawCode}, § ${section.section}, abgerufen am ${retrievedDate}.`,
    `Cache: ${section.cacheStatus}.`,
  ].join("\n");
}
