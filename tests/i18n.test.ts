import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { getUiStrings, resolveUiLanguage } from "../src/ui/i18n";

describe("ui i18n", () => {
  it("uses German for de locales", () => {
    assert.equal(resolveUiLanguage("de"), "de");
    assert.equal(resolveUiLanguage("de-DE"), "de");
    assert.equal(getUiStrings("de-AT").lookUpLawTitle, "Deutsches Gesetz nachschlagen");
    assert.equal(getUiStrings("de").supportedLaws, "Unterstützte Gesetze");
  });

  it("falls back to English for en and unknown locales", () => {
    assert.equal(resolveUiLanguage("en"), "en");
    assert.equal(resolveUiLanguage("fr"), "en");
    assert.equal(resolveUiLanguage(undefined), "en");
    assert.equal(getUiStrings("en-GB").lookUpLawTitle, "Look up law");
    assert.equal(getUiStrings("unknown").supportedLaws, "Supported laws");
  });
});
