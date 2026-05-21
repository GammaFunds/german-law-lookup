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

  it("uses canonical display abbreviations in formatted headings", () => {
    const markdown = formatLawSectionAsMarkdown({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      lawCode: "StGB",
      lawTitle: "Strafgesetzbuch",
      section: "242",
      heading: "Diebstahl",
      text: "Wer eine fremde bewegliche Sache wegnimmt.",
      retrievedAt: "2026-05-20T12:34:56.000Z",
      cacheStatus: "live",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.match(markdown, /^> \*\*§ 242 StGB – Diebstahl\*\*/m);
    assert.doesNotMatch(markdown, /§ 242 STGB/);
  });

  it("formats GG article references with Art. labels in heading and metadata", () => {
    const markdown = formatLawSectionAsMarkdown({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      lawCode: "GG",
      lawTitle: "Grundgesetz für die Bundesrepublik Deutschland",
      section: "1",
      referenceType: "article",
      heading: "Menschenwürde",
      text: "Die Würde des Menschen ist unantastbar.",
      retrievedAt: "2026-05-20T12:34:56.000Z",
      cacheStatus: "live",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.match(markdown, /^> \*\*Art\. 1 GG – Menschenwürde\*\*/m);
    assert.match(
      markdown,
      /^Quelle: Gesetze im Internet, GG, Art\. 1, abgerufen am 2026-05-20\.$/m,
    );
    assert.doesNotMatch(markdown, /§ 1 GG/);
  });

  it("formats EGBGB pure article references with Art. labels", () => {
    const markdown = formatLawSectionAsMarkdown({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      lawCode: "EGBGB",
      lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
      section: "1",
      referenceType: "article",
      text: "Das Bürgerliche Gesetzbuch tritt am 1. Januar 1900 in Kraft.",
      retrievedAt: "2026-05-21T12:34:56.000Z",
      cacheStatus: "live",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.match(markdown, /^> \*\*Art\. 1 EGBGB\*\*/m);
    assert.match(
      markdown,
      /^Quelle: Gesetze im Internet, EGBGB, Art\. 1, abgerufen am 2026-05-21\.$/m,
    );
    assert.doesNotMatch(markdown, /§ 1 EGBGB/);
  });

  it("formats EGBGB article-section references with Art. and § labels", () => {
    const markdown = formatLawSectionAsMarkdown({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      lawCode: "EGBGB",
      lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
      section: "229",
      subsection: "6",
      referenceType: "article",
      heading: "Überleitungsvorschrift",
      text: "Diese Vorschrift gilt fort.",
      retrievedAt: "2026-05-21T12:34:56.000Z",
      cacheStatus: "live",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.match(markdown, /^> \*\*Art\. 229 § 6 EGBGB – Überleitungsvorschrift\*\*/m);
    assert.match(
      markdown,
      /^Quelle: Gesetze im Internet, EGBGB, Art\. 229 § 6, abgerufen am 2026-05-21\.$/m,
    );
    assert.doesNotMatch(markdown, /§ 229 EGBGB/);
  });
});
