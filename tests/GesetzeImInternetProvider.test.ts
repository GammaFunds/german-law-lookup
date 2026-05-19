import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { LawProvider } from "../src/law/LawProvider";
import { ProviderRegistry } from "../src/law/ProviderRegistry";
import { LawProviderUnavailableError } from "../src/law/errors";
import { GesetzeImInternetProvider } from "../src/law/providers/GesetzeImInternetProvider";
import {
  buildGesetzeImInternetSectionUrl,
  extractGesetzeImInternetHeading,
  extractGesetzeImInternetPlainText,
  mapGesetzeImInternetToLawSection,
} from "../src/law/providers/gesetzeImInternetMapping";
import type { LawReference, LawSection } from "../src/law/types";

const bgb823HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; 823 BGB - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Bürgerliches Gesetzbuch (BGB)<br />
      <span class="jnenbez">&#167; 823</span>&#160;<span class="jnentitel">Schadensersatzpflicht</span>
    </h1>
  </div>
  <div>
    <div class="jnhtml">
      <div>
        <div class="jurAbsatz">(1) Wer vorsätzlich oder fahrlässig das Leben, den Körper, die Gesundheit, die Freiheit, das Eigentum oder ein sonstiges Recht eines anderen widerrechtlich verletzt, ist dem anderen zum Ersatz des daraus entstehenden Schadens verpflichtet.</div>
        <div class="jurAbsatz">(2) Die gleiche Verpflichtung trifft denjenigen, welcher gegen ein den Schutz eines anderen bezweckendes Gesetz verstößt.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

describe("GesetzeImInternet mapping helpers", () => {
  it("builds the BGB § 823 section URL", () => {
    assert.equal(
      buildGesetzeImInternetSectionUrl({ lawCode: "BGB", section: "823" }),
      "https://www.gesetze-im-internet.de/bgb/__823.html",
    );
  });

  it("normalizes letter suffixes in section URLs", () => {
    assert.equal(
      buildGesetzeImInternetSectionUrl({ lawCode: "BGB", section: "312G" }),
      "https://www.gesetze-im-internet.de/bgb/__312g.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({ lawCode: "BGB", section: "312g" }),
      "https://www.gesetze-im-internet.de/bgb/__312g.html",
    );
  });

  it("extracts heading and text from a Gesetze im Internet HTML fixture", () => {
    assert.equal(
      extractGesetzeImInternetHeading(bgb823HtmlFixture),
      "Schadensersatzpflicht",
    );

    const text = extractGesetzeImInternetPlainText(bgb823HtmlFixture);
    assert.match(text, /^\(1\) Wer vorsätzlich oder fahrlässig das Leben/);
    assert.match(text, /\(2\) Die gleiche Verpflichtung trifft denjenigen/);
    assert.doesNotMatch(text, /<div/);
  });

  it("maps BGB § 823 into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BGB", section: "823" },
      html: bgb823HtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/bgb/__823.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-19T00:00:00.000Z",
    });

    assert.equal(section.providerId, "gesetze-im-internet");
    assert.equal(section.providerLabel, "Gesetze im Internet");
    assert.equal(section.sourceUrl, "https://www.gesetze-im-internet.de/bgb/__823.html");
    assert.equal(section.lawCode, "BGB");
    assert.equal(section.lawTitle, "Bürgerliches Gesetzbuch");
    assert.equal(section.section, "823");
    assert.equal(section.heading, "Schadensersatzpflicht");
    assert.equal(section.cacheStatus, "live");
    assert.equal(section.isOfficialSource, true);
    assert.equal(section.isAuthoritativeText, false);
    assert.match(section.text, /Wer vorsätzlich oder fahrlässig/);
  });

  it("preserves original reference section while mapping LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BGB", section: "312G" },
      html: bgb823HtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/bgb/__312g.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-19T00:00:00.000Z",
    });

    assert.equal(section.section, "312G");
    assert.equal(section.sourceUrl, "https://www.gesetze-im-internet.de/bgb/__312g.html");
  });
});

describe("GesetzeImInternetProvider", () => {
  it("returns null for unsupported law code without fetching", async () => {
    let calls = 0;
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      calls += 1;
      return textResponse(bgb823HtmlFixture);
    });

    assert.equal(await provider.getSection({ lawCode: "KAGB", section: "1" }), null);
    assert.equal(calls, 0);
  });

  it("resolves BGB § 823 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(bgb823HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "BGB", section: "823" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.heading, "Schadensersatzpflicht");
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/bgb/__823.html"]);
  });

  it("throws provider failure for failed fetch", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      throw new Error("network unavailable");
    });

    await assert.rejects(
      provider.getSection({ lawCode: "BGB", section: "823" }),
      LawProviderUnavailableError,
    );
  });

  it("throws provider failure for response.ok false", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => ({
      ok: false,
      status: 500,
      text: async () => "",
    }));

    await assert.rejects(
      provider.getSection({ lawCode: "BGB", section: "823" }),
      LawProviderUnavailableError,
    );
  });

  it("returns null for 404 responses", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => ({
      ok: false,
      status: 404,
      text: async () => "",
    }));

    assert.equal(await provider.getSection({ lawCode: "BGB", section: "99999" }), null);
  });

  it("throws provider failure for 500 responses", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => ({
      ok: false,
      status: 500,
      text: async () => "",
    }));

    await assert.rejects(
      provider.getSection({ lawCode: "BGB", section: "99999" }),
      LawProviderUnavailableError,
    );
  });
});

describe("ProviderRegistry with GesetzeImInternetProvider", () => {
  it("falls through from NeuRIS null to Gesetze im Internet result", async () => {
    const calls: string[] = [];
    const neurisNull = provider("neuris", null, calls);
    const gesetze = provider("gesetze-im-internet", section("gesetze-im-internet"), calls);
    const registry = new ProviderRegistry([neurisNull, gesetze]);

    const result = await registry.getSection({ lawCode: "BGB", section: "823" });

    assert.equal(result.providerId, "gesetze-im-internet");
    assert.deepEqual(calls, ["neuris", "gesetze-im-internet"]);
  });

  it("does not fall through after Gesetze im Internet provider failure", async () => {
    const calls: string[] = [];
    const registry = new ProviderRegistry([
      provider("neuris", null, calls),
      {
        id: "gesetze-im-internet",
        label: "Gesetze im Internet",
        async getSection(_reference: LawReference) {
          calls.push("gesetze-im-internet");
          throw new LawProviderUnavailableError(
            "gesetze-im-internet",
            "fallback failed",
          );
        },
      },
      provider("mock", section("mock"), calls),
    ]);

    await assert.rejects(
      registry.getSection({ lawCode: "BGB", section: "823" }),
      LawProviderUnavailableError,
    );
    assert.deepEqual(calls, ["neuris", "gesetze-im-internet"]);
  });
});

function section(providerId: string): LawSection {
  return {
    providerId,
    providerLabel: providerId,
    lawCode: "BGB",
    lawTitle: "Bürgerliches Gesetzbuch",
    section: "823",
    text: "Fixture text",
    retrievedAt: "2026-05-19T00:00:00.000Z",
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
  };
}

function provider(id: string, result: LawSection | null, calls: string[]): LawProvider {
  return {
    id,
    label: id,
    async getSection(_reference: LawReference) {
      calls.push(id);
      return result;
    },
  };
}

function textResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: async () => body,
  };
}
