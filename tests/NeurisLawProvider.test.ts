import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { LawProviderUnavailableError } from "../src/law/errors";
import { NeurisLawProvider } from "../src/law/providers/NeurisLawProvider";
import {
  buildArticleHtmlUrl,
  extractPlainTextFromArticleHtml,
  findSectionPart,
  mapNeurisToLawSection,
  sectionNameFromReference,
  selectLegislationByExactAbbreviation,
  type NeurisCollection,
  type NeurisLegislationExpression,
} from "../src/law/providers/neurisMapping";

const searchFixture: NeurisCollection<NeurisLegislationExpression> = {
  member: [
    {
      item: {
        "@id": "/v1/legislation/eli/bund/bgbl-1/2022/s2091/2022-11-23/1/deu",
        name: "Verordnung über die Anzeigen und die Vorlage von Unterlagen nach § 36 des Kapitalanlagegesetzbuchs",
        abbreviation: "KAGBAuslAnzV",
        alternateName: "KAGB-Auslagerungsanzeigenverordnung",
        legislationIdentifier: "eli/bund/bgbl-1/2022/s2091/2022-11-23/1/deu",
      },
    },
    {
      item: {
        "@id": "/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu",
        name: "Kapitalanlagegesetzbuch",
        abbreviation: "KAGB",
        alternateName: null,
        legislationIdentifier: "eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu",
      },
    },
  ],
};

const expressionFixture: NeurisLegislationExpression = {
  "@id": "/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu",
  name: "Kapitalanlagegesetzbuch",
  abbreviation: "KAGB",
  alternateName: null,
  legislationIdentifier: "eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu",
  temporalCoverage: null,
  encoding: [
    {
      contentUrl:
        "/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu/2026-04-24/regelungstext-verkuendung-1.html",
      encodingFormat: "text/html",
    },
    {
      contentUrl:
        "/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu/2026-04-24/regelungstext-verkuendung-1.xml",
      encodingFormat: "application/xml",
    },
  ],
  hasPart: [
    {
      eId: "hauptteil-n1_kapitel-n1",
      name: "Kapitel 1",
      headline: "Allgemeine Bestimmungen für Investmentvermögen und Verwaltungsgesellschaften",
      hasPart: [
        {
          eId: "hauptteil-n1_kapitel-n1_abschnitt-n1",
          name: "Abschnitt 1",
          headline: "Allgemeine Vorschriften",
          hasPart: [
            {
              eId: "art-z1",
              name: "§ 1",
              headline: "Begriffsbestimmungen",
              temporalCoverage: "1001-01-01/..",
              hasPart: [],
            },
          ],
        },
      ],
    },
  ],
};

const articleHtmlFixture = `
<!DOCTYPE HTML>
<html lang="de">
  <head><title>Kapitalanlagegesetzbuch&nbsp;(KAGB)</title></head>
  <body class="akn-akomaNtoso">
    <div id="art-z1">
      <h2 class="einzelvorschrift"><span>§ 1</span> <span>Begriffsbestimmungen</span></h2>
      <section>
        <span>(1)</span>
        <div><p>Investmentvermögen ist jeder Organismus für gemeinsame Anlagen.</p></div>
      </section>
      <section>
        <span>(2)</span>
        <div><p>Organismen für gemeinsame Anlagen in Wertpapieren (OGAW) sind Investmentvermögen.</p></div>
      </section>
    </div>
  </body>
</html>`;

describe("NeuRIS mapping helpers", () => {
  it("selects legislation by exact abbreviation", () => {
    const selected = selectLegislationByExactAbbreviation(searchFixture, "KAGB");

    assert.equal(selected?.name, "Kapitalanlagegesetzbuch");
    assert.equal(
      selectLegislationByExactAbbreviation(searchFixture, "BGB"),
      null,
    );
  });

  it("finds a nested section part by section name", () => {
    const sectionPart = findSectionPart(
      expressionFixture.hasPart,
      sectionNameFromReference({ lawCode: "KAGB", section: "1" }),
    );

    assert.equal(sectionPart?.eId, "art-z1");
    assert.equal(sectionPart?.headline, "Begriffsbestimmungen");
    assert.equal(findSectionPart(expressionFixture.hasPart, "§ 999"), null);
  });

  it("builds a section article HTML URL from the manifestation URL", () => {
    const sectionPart = findSectionPart(expressionFixture.hasPart, "§ 1");
    assert.ok(sectionPart);

    assert.equal(
      buildArticleHtmlUrl(
        expressionFixture,
        sectionPart,
        "https://testphase.rechtsinformationen.bund.de",
      ),
      "https://testphase.rechtsinformationen.bund.de/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu/2026-04-24/regelungstext-verkuendung-1/art-z1.html",
    );
  });

  it("extracts plain text from NeuRIS article HTML", () => {
    const text = extractPlainTextFromArticleHtml(articleHtmlFixture);

    assert.match(text, /§ 1 Begriffsbestimmungen/);
    assert.match(text, /\(1\)\s+Investmentvermögen ist jeder Organismus/);
    assert.doesNotMatch(text, /<section>/);
  });

  it("maps NeuRIS metadata and article HTML into LawSection", () => {
    const sectionPart = findSectionPart(expressionFixture.hasPart, "§ 1");
    assert.ok(sectionPart);

    const lawSection = mapNeurisToLawSection({
      expression: expressionFixture,
      reference: { lawCode: "KAGB", section: "1" },
      sectionPart,
      articleHtml: articleHtmlFixture,
      articleUrl:
        "https://testphase.rechtsinformationen.bund.de/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu/2026-04-24/regelungstext-verkuendung-1/art-z1.html",
      providerId: "neuris",
      providerLabel: "Rechtsinformationen des Bundes",
      retrievedAt: "2026-05-19T00:00:00.000Z",
    });

    assert.equal(lawSection.providerId, "neuris");
    assert.equal(lawSection.lawCode, "KAGB");
    assert.equal(lawSection.lawTitle, "Kapitalanlagegesetzbuch");
    assert.equal(lawSection.section, "1");
    assert.equal(lawSection.heading, "Begriffsbestimmungen");
    assert.equal(lawSection.cacheStatus, "live");
    assert.equal(lawSection.isOfficialSource, true);
    assert.equal(lawSection.isAuthoritativeText, true);
    assert.match(lawSection.text, /Investmentvermögen ist jeder Organismus/);
  });
});

describe("NeurisLawProvider", () => {
  it("returns null immediately for translation-en requests", async () => {
    let calls = 0;
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async () => {
      calls += 1;
      return response(searchFixture);
    });

    assert.equal(
      await provider.getSection({
        lawCode: "KAGB",
        section: "1",
        sourceVariant: "translation-en",
      }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("resolves a section through fixture-backed fetch calls", async () => {
    const requestedUrls: string[] = [];
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async (url) => {
      requestedUrls.push(url);

      if (url.includes("/v1/legislation?")) {
        return response(searchFixture);
      }

      if (url.endsWith("/v1/legislation/eli/bund/bgbl-1/2013/s1981/2026-04-16/1/deu")) {
        return response(expressionFixture);
      }

      if (url.endsWith("/art-z1.html")) {
        return response(articleHtmlFixture);
      }

      return { ok: false, json: async () => ({}), text: async () => "" };
    });

    const section = await provider.getSection({ lawCode: "KAGB", section: "1" });

    assert.equal(section?.lawCode, "KAGB");
    assert.equal(section?.heading, "Begriffsbestimmungen");
    assert.equal(requestedUrls.length, 3);
  });

  it("returns null when no exact abbreviation match exists", async () => {
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async () =>
      response(searchFixture),
    );

    assert.equal(await provider.getSection({ lawCode: "BGB", section: "823" }), null);
  });

  it("returns null when the matching section does not exist", async () => {
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async (url) => {
      if (url.includes("/v1/legislation?")) {
        return response(searchFixture);
      }

      return response(expressionFixture);
    });

    assert.equal(await provider.getSection({ lawCode: "KAGB", section: "999" }), null);
  });

  it("returns null when no article URL can be built", async () => {
    const expressionWithoutHtml = {
      ...expressionFixture,
      encoding: [{ contentUrl: "/example.xml", encodingFormat: "application/xml" }],
    };
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async (url) => {
      if (url.includes("/v1/legislation?")) {
        return response(searchFixture);
      }

      return response(expressionWithoutHtml);
    });

    assert.equal(await provider.getSection({ lawCode: "KAGB", section: "1" }), null);
  });

  it("throws a provider failure when fetch rejects", async () => {
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async () => {
      throw new Error("network unavailable");
    });

    await assert.rejects(
      provider.getSection({ lawCode: "KAGB", section: "1" }),
      LawProviderUnavailableError,
    );
  });

  it("throws a provider failure when the response is not ok", async () => {
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async () => ({
      ok: false,
      json: async () => ({}),
      text: async () => "",
    }));

    await assert.rejects(
      provider.getSection({ lawCode: "KAGB", section: "1" }),
      LawProviderUnavailableError,
    );
  });

  it("throws a provider failure when JSON parsing fails", async () => {
    const provider = new NeurisLawProvider("https://testphase.rechtsinformationen.bund.de", async () => ({
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
      text: async () => "",
    }));

    await assert.rejects(
      provider.getSection({ lawCode: "KAGB", section: "1" }),
      LawProviderUnavailableError,
    );
  });
});

function response(body: unknown) {
  return {
    ok: true,
    json: async () => body,
    text: async () => String(body),
  };
}
