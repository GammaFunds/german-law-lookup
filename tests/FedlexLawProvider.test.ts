import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { FedlexLawProvider } from "../src/law/providers/FedlexLawProvider";
import {
  buildFedlexQueryBody,
  convertFedlexHtmlToText,
  extractFedlexArticleFromResponse,
  mapFedlexReference,
  mapFedlexToLawSection,
  normalizeFedlexHeading,
} from "../src/law/providers/fedlexMapping";
import type { FedlexArticleData } from "../src/law/providers/fedlexMapping";

const bvArt8Fixture = {
  hits: {
    hits: [
      {
        _source: {
          title: "<p>BV Art. 8</p>",
          contentParent: "https://fedlex.data.admin.ch/eli/cc/1999/404",
        },
        inner_hits: {
          deContent: {
            hits: {
              hits: [
                {
                  _source: {
                    id: "art_8",
                    title: "<p>Rechtsgleichheit</p>",
                    content:
                      "<p>Alle Menschen sind vor dem Gesetz gleich.</p><p>(2) Niemand darf wegen seiner Herkunft, seiner Rasse, seines Geschlechts, seines Alters, seiner Sprache, seiner sozialen Stellung, seiner Lebensform, seiner religiösen, weltanschaulichen oder politischen Überzeugung oder wegen einer körperlichen, geistigen oder psychischen Behinderung diskriminiert werden.</p><p>(3) Mann und Frau sind gleichberechtigt. Das Gesetz sorgt für ihre tatsächliche Gleichstellung, vor allem in Familie, Ausbildung und Arbeit.</p><p>(4) Das Gesetz sieht Massnahmen zur Beseitigung von Benachteiligungen der Behinderten vor.</p>",
                    order: 1,
                    itemUri:
                      "https://fedlex.data.admin.ch/eli/cc/1999/404/art_8",
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },
};

const bvArt41Fixture = {
  hits: {
    hits: [
      {
        _source: {
          title: "<p>BV Art. 41</p>",
          contentParent: "https://fedlex.data.admin.ch/eli/cc/1999/404",
        },
        inner_hits: {
          deContent: {
            hits: {
              hits: [
                {
                  _source: {
                    id: "art_41",
                    title: "<p>Sozialziele</p>",
                    content:
                      "<p>Bund und Kantone setzen sich in Ergänzung von Eigenverantwortung und privater Initiative dafür ein, dass</p><p>a. jede Person an der sozialen Sicherheit teilhat;</p><p>b. jede Person die für ihre Gesundheit notwendige Pflege erhält;</p><p>c. Familien als Gemeinschaften von Erwachsenen und Kindern geschützt und gefördert werden;</p><p>d. jede Person die ihrer Leistungsfähigkeit entsprechende Ausbildung erhält;</p><p>e. jede Person eine angemessene und zumutbare Arbeit zu angemessenen Bedingungen findet;</p><p>f. jede Person zu angemessenen Bedingungen Wohnung finden kann.</p>",
                    order: 41,
                    itemUri:
                      "https://fedlex.data.admin.ch/eli/cc/1999/404/art_41",
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },
};

const zgbArt1Fixture = {
  hits: {
    hits: [
      {
        _source: {
          title: "<p>ZGB Art. 1</p>",
          contentParent: "https://fedlex.data.admin.ch/eli/cc/24/233_245_233",
        },
        inner_hits: {
          deContent: {
            hits: {
              hits: [
                {
                  _source: {
                    id: "art_1",
                    title: "<p>Anwendung des Rechts</p>",
                    content:
                      "<p><sup>(1)</sup> Das Gesetz findet auf alle Rechtsfragen Anwendung, nach deren Wortlaut oder Auslegung eine Bestimmung getroffen werden kann.</p><p><sup>(2)</sup> Kann dem Gesetz keine Vorschrift entnommen werden, so soll das Gericht nach Gewohnheitsrecht und, wo auch ein solches fehlt, nach der Regel entscheiden, die es als Gesetzgeber aufstellen würde.</p><p><sup>(3)</sup> Es folgt dabei bewährter Lehre und Überlieferung.</p>",
                    order: 1,
                    itemUri:
                      "https://fedlex.data.admin.ch/eli/cc/24/233_245_233/art_1",
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },
};

const emptyHitsFixture = {
  hits: {
    hits: [],
  },
};

describe("Fedlex mapping helpers", () => {
  it("maps BV Art. 8 to work URI and article number", () => {
    const result = mapFedlexReference({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.notEqual(result, null);
    assert.equal(
      result!.workUri,
      "https://fedlex.data.admin.ch/eli/cc/1999/404",
    );
    assert.equal(result!.articleNumber, "8");
  });

  it("maps ZGB Art. 1 to work URI and article number", () => {
    const result = mapFedlexReference({
      lawCode: "ZGB",
      section: "1",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.notEqual(result, null);
    assert.equal(
      result!.workUri,
      "https://fedlex.data.admin.ch/eli/cc/24/233_245_233",
    );
    assert.equal(result!.articleNumber, "1");
  });

  it("returns null for unsupported CH OR Art. 1", () => {
    const result = mapFedlexReference({
      lawCode: "OR",
      section: "1",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(result, null);
  });

  it("returns null for non-CH jurisdiction", () => {
    const result = mapFedlexReference({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
    });

    assert.equal(result, null);
  });

  it("returns null for CH § references", () => {
    const result = mapFedlexReference({
      lawCode: "BV",
      section: "8",
      referenceType: "section",
      jurisdiction: "CH",
    });

    assert.equal(result, null);
  });

  it("builds Fedlex ES query body with work URI and article number", () => {
    const body = buildFedlexQueryBody(
      "https://fedlex.data.admin.ch/eli/cc/1999/404",
      "8",
    ) as Record<string, unknown>;

    const query = body.query as Record<string, unknown>;
    const bool = query.bool as Record<string, unknown>;
    const must = bool.must as Array<Record<string, unknown>>;

    const term = (must[0] as Record<string, unknown>)
      .term as Record<string, string>;
    assert.equal(
      term["contentParent.keyword"],
      "https://fedlex.data.admin.ch/eli/cc/1999/404",
    );
  });

  it("extracts article data from BV Art. 8 response", () => {
    const data = extractFedlexArticleFromResponse(bvArt8Fixture);

    assert.notEqual(data, null);
    assert.equal(data!.id, "art_8");
    assert.equal(data!.title, "<p>Rechtsgleichheit</p>");
    assert.match(
      data!.content!,
      /Alle Menschen sind vor dem Gesetz gleich/,
    );
    assert.equal(data!.order, 1);
    assert.equal(
      data!.itemUri,
      "https://fedlex.data.admin.ch/eli/cc/1999/404/art_8",
    );
  });

  it("extracts article data from BV Art. 41 with Fedlex id art_41", () => {
    const data = extractFedlexArticleFromResponse(bvArt41Fixture);

    assert.notEqual(data, null);
    assert.equal(data!.id, "art_41");
    assert.equal(data!.title, "<p>Sozialziele</p>");
    assert.match(data!.content!, /Bund und Kantone setzen sich/);
  });

  it("extracts article data from ZGB Art. 1 response", () => {
    const data = extractFedlexArticleFromResponse(zgbArt1Fixture);

    assert.notEqual(data, null);
    assert.equal(data!.id, "art_1");
    assert.match(
      data!.content!,
      /Das Gesetz findet auf alle Rechtsfragen Anwendung/,
    );
  });

  it("returns null for empty hits response", () => {
    const data = extractFedlexArticleFromResponse(emptyHitsFixture);
    assert.equal(data, null);
  });

  it("returns null for null response", () => {
    const data = extractFedlexArticleFromResponse(null);
    assert.equal(data, null);
  });

  it("converts Fedlex HTML title to plain text", () => {
    const text = convertFedlexHtmlToText("<p>Rechtsgleichheit</p>");
    assert.equal(text, "Rechtsgleichheit");
  });

  it("converts Fedlex HTML content with paragraphs to plain text", () => {
    const html =
      "<p>(1) Das Gesetz findet auf alle Rechtsfragen Anwendung.</p><p>(2) Kann dem Gesetz keine Vorschrift entnommen werden.</p>";
    const text = convertFedlexHtmlToText(html);

    assert.match(text, /\(1\) Das Gesetz findet/);
    assert.match(text, /\(2\) Kann dem Gesetz keine/);
  });

  it("converts sup paragraph numbers to readable text", () => {
    const html =
      "<p><sup>(1)</sup> Das Gesetz findet auf alle Rechtsfragen Anwendung.</p>";
    const text = convertFedlexHtmlToText(html);

    assert.match(text, /\(1\)/);
    assert.match(text, /Das Gesetz findet/);
  });

  it("normalizes heading by removing leading article label", () => {
    const heading = normalizeFedlexHeading(
      '<h6 class="heading"><b>Art. 8</b> Rechtsgleichheit</h6>',
      "8",
    );
    assert.equal(heading, "Rechtsgleichheit");
  });

  it("normalizes heading with Art format (no period)", () => {
    const heading = normalizeFedlexHeading('<p>Art 8 Rechtsgleichheit</p>', "8");
    assert.equal(heading, "Rechtsgleichheit");
  });

  it("normalizes heading with Artikel format", () => {
    const heading = normalizeFedlexHeading('<p>Artikel 8 Rechtsgleichheit</p>', "8");
    assert.equal(heading, "Rechtsgleichheit");
  });

  it("returns undefined for empty heading after normalization", () => {
    const heading = normalizeFedlexHeading('<p>Art. 8</p>', "8");
    assert.equal(heading, undefined);
  });

  it("preserves article number appearing later in title", () => {
    const heading = normalizeFedlexHeading('<p>Art. 8 Abs. 8 Satz 2</p>', "8");
    assert.equal(heading, "Abs. 8 Satz 2");
  });

  it("formats dl/dt/dd as readable line", () => {
    const html = '<dl><dt>a.</dt><dd>jede Person an der sozialen Sicherheit teilhat;</dd></dl>';
    const text = convertFedlexHtmlToText(html);
    assert.match(text, /a\./);
    assert.match(text, /jede Person an der sozialen Sicherheit teilhat/);
  });

  it("removes script and style block contents", () => {
    const html = '<p>Main content</p><script>var x = 1;</script><style>.cls{}</style><p>After</p>';
    const text = convertFedlexHtmlToText(html);
    assert.doesNotMatch(text, /var x = 1/);
    assert.doesNotMatch(text, /\.cls/);
    assert.match(text, /Main content/);
    assert.match(text, /After/);
  });

  it("does not contain raw HTML tags in output", () => {
    const html = '<p><sup>1</sup> Alle <b>Menschen</b> sind vor dem Gesetz gleich.</p><h6>Art. 8</h6>';
    const text = convertFedlexHtmlToText(html);
    assert.doesNotMatch(text, /<p/);
    assert.doesNotMatch(text, /<h6/);
    assert.doesNotMatch(text, /<sup/);
    assert.doesNotMatch(text, /<dl/);
    assert.doesNotMatch(text, /<dt/);
    assert.doesNotMatch(text, /<dd/);
    assert.doesNotMatch(text, /<script/);
    assert.doesNotMatch(text, /<style/);
  });

  it("preserves multiple paragraph line separation", () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p><p>Third paragraph.</p>';
    const text = convertFedlexHtmlToText(html);
    const lines = text.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length >= 3, true);
    assert.match(lines[0], /First paragraph/);
    assert.match(lines[1], /Second paragraph/);
    assert.match(lines[2], /Third paragraph/);
  });

  it("maps BV Art. 8 into LawSection with CH metadata", () => {
    const articleData: FedlexArticleData = {
      id: "art_8",
      title: "<p>Rechtsgleichheit</p>",
      content:
        "<p>Alle Menschen sind vor dem Gesetz gleich.</p>",
      order: 1,
      itemUri: "https://fedlex.data.admin.ch/eli/cc/1999/404/art_8",
    };

    const section = mapFedlexToLawSection({
      reference: {
        lawCode: "BV",
        section: "8",
        referenceType: "article",
        jurisdiction: "CH",
      },
      articleData,
      providerId: "fedlex",
      providerLabel: "Fedlex / Bundesrecht der Schweiz",
      retrievedAt: "2026-07-10T00:00:00.000Z",
    });

    assert.equal(section.providerId, "fedlex");
    assert.equal(
      section.providerLabel,
      "Fedlex / Bundesrecht der Schweiz",
    );
    assert.equal(section.sourceUrl, articleData.itemUri);
    assert.equal(section.lawCode, "BV");
    assert.equal(
      section.lawTitle,
      "Bundesverfassung der Schweizerischen Eidgenossenschaft",
    );
    assert.equal(section.section, "8");
    assert.equal(section.referenceType, "article");
    assert.equal(section.sourceVariant, "official-de");
    assert.equal(section.jurisdiction, "CH");
    assert.equal(section.heading, "Rechtsgleichheit");
    assert.match(
      section.text,
      /Alle Menschen sind vor dem Gesetz gleich/,
    );
    assert.equal(section.cacheStatus, "live");
    assert.equal(section.isOfficialSource, true);
    assert.equal(section.isAuthoritativeText, true);
  });

  it("maps ZGB Art. 1 into LawSection", () => {
    const articleData: FedlexArticleData = {
      id: "art_1",
      title: "<p>Anwendung des Rechts</p>",
      content:
        "<p>Das Gesetz findet auf alle Rechtsfragen Anwendung.</p>",
      order: 1,
      itemUri: "https://fedlex.data.admin.ch/eli/cc/24/233_245_233/art_1",
    };

    const section = mapFedlexToLawSection({
      reference: {
        lawCode: "ZGB",
        section: "1",
        referenceType: "article",
        jurisdiction: "CH",
      },
      articleData,
      providerId: "fedlex",
      providerLabel: "Fedlex / Bundesrecht der Schweiz",
      retrievedAt: "2026-07-10T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "ZGB");
    assert.equal(section.jurisdiction, "CH");
    assert.equal(section.heading, "Anwendung des Rechts");
    assert.match(
      section.text,
      /Das Gesetz findet auf alle Rechtsfragen Anwendung/,
    );
  });
});

describe("FedlexLawProvider", () => {
  it("resolves CH BV Art. 8 through fixture-backed fetch", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(bvArt8Fixture),
        json: async () => bvArt8Fixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.notEqual(section, null);
    assert.equal(section!.heading, "Rechtsgleichheit");
    assert.match(
      section!.text,
      /Alle Menschen sind vor dem Gesetz gleich/,
    );
    assert.equal(section!.jurisdiction, "CH");
    assert.equal(section!.lawCode, "BV");
    assert.equal(section!.referenceType, "article");
  });

  it("resolves CH BV Art. 41 through fixture-backed fetch", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(bvArt41Fixture),
        json: async () => bvArt41Fixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "41",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.notEqual(section, null);
    assert.match(
      section!.text,
      /Bund und Kantone setzen sich/,
    );
    assert.equal(section!.jurisdiction, "CH");
  });

  it("captures Fedlex transport arguments for BV Art. 41", async () => {
    let capturedUrl: string | undefined;
    let capturedBody: string | undefined;
    const transport = async (url: string, body: string) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(bvArt41Fixture),
        json: async () => bvArt41Fixture,
      };
    };

    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      transport,
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "41",
      referenceType: "article",
      jurisdiction: "CH",
    });

    // Verify URL
    assert.equal(
      capturedUrl,
      "https://www.fedlex.admin.ch/elasticsearch/proxy/_search?index=data",
    );

    // Verify body is a valid JSON string
    assert.equal(typeof capturedBody, "string");
    const parsed = JSON.parse(capturedBody!);

    // Verify contentParent.keyword
    assert.equal(
      parsed.query.bool.must[0].term["contentParent.keyword"],
      "https://fedlex.data.admin.ch/eli/cc/1999/404",
    );

    // Verify nested path
    assert.equal(parsed.query.bool.must[1].nested.path, "deContent");

    // Verify deContent.id.keyword = art_41
    assert.equal(
      parsed.query.bool.must[1].nested.query.term["deContent.id.keyword"],
      "art_41",
    );

    // Verify inner_hits requests _source: true
    assert.equal(parsed.query.bool.must[1].nested.inner_hits._source, true);

    // Verify section is returned correctly
    assert.notEqual(section, null);
    assert.match(
      section!.text,
      /Bund und Kantone setzen sich/,
    );
    assert.equal(section!.jurisdiction, "CH");
  });

  it("resolves CH ZGB Art. 1 through fixture-backed fetch", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(zgbArt1Fixture),
        json: async () => zgbArt1Fixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "ZGB",
      section: "1",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.notEqual(section, null);
    assert.equal(section!.jurisdiction, "CH");
    assert.equal(section!.lawCode, "ZGB");
    assert.match(
      section!.text,
      /Das Gesetz findet auf alle Rechtsfragen Anwendung/,
    );
  });

  it("returns null for unsupported CH OR Art. 1", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(emptyHitsFixture),
        json: async () => emptyHitsFixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "OR",
      section: "1",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });

  it("returns null for CH § references", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(emptyHitsFixture),
        json: async () => emptyHitsFixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "1",
      referenceType: "section",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });

  it("returns null for non-CH references", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(bvArt8Fixture),
        json: async () => bvArt8Fixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
    });

    assert.equal(section, null);
  });

  it("returns null on 404 response", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: false,
        status: 404,
        text: async () => "not found",
        json: async () => ({}),
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "999",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });

  it("returns null on non-OK non-404 response without throwing", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: false,
        status: 500,
        text: async () => "server error",
        json: async () => ({}),
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });

  it("returns null when fetch rejects (network error)", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => {
        throw new Error("network unavailable");
      },
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "8",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });

  it("returns null on missing article (empty hits)", async () => {
    const provider = new FedlexLawProvider(
      "https://www.fedlex.admin.ch",
      async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(emptyHitsFixture),
        json: async () => emptyHitsFixture,
      }),
    );

    const section = await provider.getSection({
      lawCode: "BV",
      section: "999",
      referenceType: "article",
      jurisdiction: "CH",
    });

    assert.equal(section, null);
  });
});
