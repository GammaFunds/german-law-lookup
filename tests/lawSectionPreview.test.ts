import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { buildLawSectionPreviewModel } from "../src/ui/lawSectionPreview";
import type { LawSection } from "../src/law/types";

describe("lawSectionPreview", () => {
  const section: LawSection = {
    providerId: "gesetze-im-internet",
    providerLabel: "Gesetze im Internet",
    sourceUrl: "https://www.gesetze-im-internet.de/stgb/__242.html",
    lawCode: "StGB",
    lawTitle: "Strafgesetzbuch",
    section: "242",
    heading: "Diebstahl",
    text: "(1) Wer eine fremde bewegliche Sache wegnimmt.\n(2) Der Versuch ist strafbar.",
    retrievedAt: "2026-05-20T12:34:56.000Z",
    cacheStatus: "cached",
    isOfficialSource: true,
    isAuthoritativeText: false,
  };

  it("builds a readable preview model with metadata by default", () => {
    const preview = buildLawSectionPreviewModel(section);

    assert.equal(preview.title, "§ 242 StGB – Diebstahl");
    assert.deepEqual(preview.paragraphs, [
      "(1) Wer eine fremde bewegliche Sache wegnimmt.",
      "(2) Der Versuch ist strafbar.",
    ]);
    assert.deepEqual(preview.metadataLines, [
      "Quelle: Gesetze im Internet, StGB, § 242, abgerufen am 2026-05-20.",
      "Cache: cached.",
    ]);
  });

  it("omits metadata lines when disabled", () => {
    const preview = buildLawSectionPreviewModel(section, {
      includeMetadataFooter: false,
    });

    assert.equal(preview.title, "§ 242 StGB – Diebstahl");
    assert.deepEqual(preview.metadataLines, []);
  });

  it("uses Art. labels for GG article previews", () => {
    const preview = buildLawSectionPreviewModel({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      sourceUrl: "https://www.gesetze-im-internet.de/gg/art_1.html",
      lawCode: "GG",
      lawTitle: "Grundgesetz für die Bundesrepublik Deutschland",
      section: "1",
      referenceType: "article",
      heading: "Menschenwürde",
      text: "(1) Die Würde des Menschen ist unantastbar.",
      retrievedAt: "2026-05-20T12:34:56.000Z",
      cacheStatus: "cached",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.equal(preview.title, "Art. 1 GG – Menschenwürde");
    assert.deepEqual(preview.metadataLines, [
      "Quelle: Gesetze im Internet, GG, Art. 1, abgerufen am 2026-05-20.",
      "Cache: cached.",
    ]);
  });

  it("uses Art. labels for EGBGB pure article previews", () => {
    const preview = buildLawSectionPreviewModel({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      sourceUrl: "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html",
      lawCode: "EGBGB",
      lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
      section: "1",
      referenceType: "article",
      text: "Das Bürgerliche Gesetzbuch tritt am 1. Januar 1900 in Kraft.",
      retrievedAt: "2026-05-21T12:34:56.000Z",
      cacheStatus: "cached",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.equal(preview.title, "Art. 1 EGBGB");
    assert.deepEqual(preview.metadataLines, [
      "Quelle: Gesetze im Internet, EGBGB, Art. 1, abgerufen am 2026-05-21.",
      "Cache: cached.",
    ]);
  });

  it("uses combined article-section labels for EGBGB previews", () => {
    const preview = buildLawSectionPreviewModel({
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      sourceUrl: "https://www.gesetze-im-internet.de/bgbeg/art_229__6.html",
      lawCode: "EGBGB",
      lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
      section: "229",
      subsection: "6",
      referenceType: "article",
      heading: "Überleitungsvorschrift",
      text: "Diese Vorschrift gilt fort.",
      retrievedAt: "2026-05-21T12:34:56.000Z",
      cacheStatus: "cached",
      isOfficialSource: true,
      isAuthoritativeText: false,
    });

    assert.equal(preview.title, "Art. 229 § 6 EGBGB – Überleitungsvorschrift");
    assert.deepEqual(preview.metadataLines, [
      "Quelle: Gesetze im Internet, EGBGB, Art. 229 § 6, abgerufen am 2026-05-21.",
      "Cache: cached.",
    ]);
  });
});
