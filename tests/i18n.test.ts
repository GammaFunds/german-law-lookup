import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  defaultLawSourceVariantForLanguage,
  getUiStrings,
  resolveUiLanguage,
} from "../src/ui/i18n";

describe("ui i18n", () => {
  it("uses German for de locales", () => {
    assert.equal(resolveUiLanguage("de"), "de");
    assert.equal(resolveUiLanguage("de-DE"), "de");
    assert.equal(getUiStrings("de-AT").lookUpLawTitle, "Deutsches Gesetz nachschlagen");
    assert.equal(getUiStrings("de").supportedLaws, "Unterstützte Gesetze");
    assert.equal(
      getUiStrings("de").useEnglishTranslationWhenAvailable,
      "Englischen Gesetzestext anzeigen, sofern vorhanden",
    );
    assert.equal(getUiStrings("de").defaultLawTextSource, "Standard-Gesetzestextquelle");
    assert.equal(
      getUiStrings("de").englishTranslationWhenAvailable,
      "Englischer Gesetzestext, sofern vorhanden",
    );
    assert.equal(
      getUiStrings("de").unsupportedCandidatesNote,
      "FreizügG/EU bleibt vorerst ein Follow-up; SGB XIII wird bewusst nicht als geltendes SGB-Buch unterstützt.",
    );
  });

  it("falls back to English for en and unknown locales", () => {
    assert.equal(resolveUiLanguage("en"), "en");
    assert.equal(resolveUiLanguage("fr"), "en");
    assert.equal(resolveUiLanguage(undefined), "en");
    assert.equal(getUiStrings("en-GB").lookUpLawTitle, "Look up law");
    assert.equal(getUiStrings("unknown").supportedLaws, "Supported laws");
    assert.equal(
      getUiStrings("en").englishTranslationUnavailableForCitation,
      "No verified English translation is configured for this citation.",
    );
    assert.equal(getUiStrings("en").defaultLawTextSource, "Default law text source");
    assert.equal(
      getUiStrings("en").useEnglishTranslationWhenAvailable,
      "Show English law text when available",
    );
    assert.equal(
      getUiStrings("en").unsupportedCandidatesNote,
      "FreizügG/EU remains a follow-up for now; SGB XIII is intentionally not supported as a current SGB book.",
    );
  });

  it("uses official-de when nothing is stored on German locales", () => {
    assert.equal(defaultLawSourceVariantForLanguage("de"), "official-de");
    assert.equal(defaultLawSourceVariantForLanguage("de-DE"), "official-de");
  });

  it("uses official-de when nothing is stored on non-German or unknown locales", () => {
    assert.equal(defaultLawSourceVariantForLanguage("en"), "official-de");
    assert.equal(defaultLawSourceVariantForLanguage("fr"), "official-de");
    assert.equal(defaultLawSourceVariantForLanguage(undefined), "official-de");
  });

  it("uses official-de for existing plugin data without a stored variant on non-German locales", () => {
    assert.equal(
      defaultLawSourceVariantForLanguage("en", undefined),
      "official-de",
    );
  });

  it("uses official-de for existing plugin data without a stored variant on German locales", () => {
    assert.equal(
      defaultLawSourceVariantForLanguage("de", undefined),
      "official-de",
    );
  });

  it("keeps a stored official-de value even on non-German locales", () => {
    assert.equal(
      defaultLawSourceVariantForLanguage("en", "official-de"),
      "official-de",
    );
  });

  it("keeps a stored translation-en value even on German locales", () => {
    assert.equal(
      defaultLawSourceVariantForLanguage("de", "translation-en"),
      "translation-en",
    );
  });
});
