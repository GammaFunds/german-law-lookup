import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { formatLawSectionAsMarkdown } from "../src/law/CitationFormatter";
import type { LawSection } from "../src/law/types";

describe("formatLawSectionAsMarkdown", () => {
  it("formats a law section with citation metadata", () => {
    const section: LawSection = {
      providerId: "mock",
      providerLabel: "Mock Law Provider",
      lawCode: "BGB",
      lawTitle: "Bürgerliches Gesetzbuch",
      section: "823",
      heading: "Schadensersatzpflicht",
      text: "Wer vorsätzlich handelt.",
      retrievedAt: "2026-05-19T12:34:56.000Z",
      cacheStatus: "cached",
      isOfficialSource: false,
      isAuthoritativeText: false,
    };

    assert.equal(
      formatLawSectionAsMarkdown(section),
      [
        "> **§ 823 BGB – Schadensersatzpflicht**",
        ">",
        "> Wer vorsätzlich handelt.",
        "",
        "Quelle: Mock Law Provider, BGB, § 823, abgerufen am 2026-05-19.",
        "Cache: cached.",
      ].join("\n"),
    );
  });
});
