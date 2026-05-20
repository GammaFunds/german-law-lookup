import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { formatLawSectionAsMarkdown } from "../src/law/CitationFormatter";
import type { LawSection } from "../src/law/types";

describe("formatLawSectionAsMarkdown", () => {
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

  it("includes source and cache metadata by default", () => {
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

  it("omits source and cache metadata when disabled", () => {
    assert.equal(
      formatLawSectionAsMarkdown(section, { includeMetadataFooter: false }),
      [
        "> **§ 823 BGB – Schadensersatzpflicht**",
        ">",
        "> Wer vorsätzlich handelt.",
      ].join("\n"),
    );
  });

  it("preserves heading and section text when metadata is omitted", () => {
    const markdown = formatLawSectionAsMarkdown(section, {
      includeMetadataFooter: false,
    });

    assert.match(markdown, /^> \*\*§ 823 BGB – Schadensersatzpflicht\*\*/m);
    assert.match(markdown, /^> Wer vorsätzlich handelt\.$/m);
    assert.doesNotMatch(markdown, /^Quelle:/m);
    assert.doesNotMatch(markdown, /^Cache:/m);
  });

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
