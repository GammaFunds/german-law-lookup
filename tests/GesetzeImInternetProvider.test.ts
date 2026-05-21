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
  getSupportedGesetzeImInternetLaws,
  mapGesetzeImInternetToLawSection,
} from "../src/law/providers/gesetzeImInternetMapping";
import type { LawReference, LawSection } from "../src/law/types";

const bgb823HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; 823 BGB - Einzelnorm</title>
  <style>
    .print { display: none; }
  </style>
  <script>
    /* <![CDATA[ */
    window.printLinksEnabled = true;
    /* ]]> */
  </script>
</head>
<body>
  <!-- Navigation comment that should not enter text -->
  <nav>
    <a href="#seitenanfang">zum Seitenanfang</a>
    <a href="/bgb/inhaltsuebersicht.html">Inhaltsübersicht</a>
  </nav>
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
      <div class="print">
        <a href="#">Seite ausdrucken</a>
      </div>
    </div>
  </div>
  <footer>
    <a href="/impressum.html">Impressum</a>
    <a href="/datenschutz.html">Datenschutz</a>
    <a href="/barrierefreiheit.html">Barrierefreiheitserklärung</a>
    <a href="/feedback.html">Feedback-Formular</a>
  </footer>
</body>
</html>`;

const stgb242HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; 242 StGB - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Strafgesetzbuch (StGB)<br />
      <span class="jnenbez">&#167; 242</span>&#160;<span class="jnentitel">Diebstahl</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">(1) Wer eine fremde bewegliche Sache einem anderen in der Absicht wegnimmt, die Sache sich oder einem Dritten rechtswidrig zuzueignen, wird mit Freiheitsstrafe bis zu fünf Jahren oder mit Geldstrafe bestraft.</div>
  </div>
</body>
</html>`;

const ggArt1HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>Art 1 GG - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Grundgesetz für die Bundesrepublik Deutschland<br />
      <span class="jnenbez">Art 1</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">(1) Die Würde des Menschen ist unantastbar. Sie zu achten und zu schützen ist Verpflichtung aller staatlichen Gewalt.</div>
    <div class="jurAbsatz">(2) Das Deutsche Volk bekennt sich darum zu unverletzlichen und unveräußerlichen Menschenrechten.</div>
  </div>
</body>
</html>`;

const egbgbArt229Sec1HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>Art 229 § 1 EGBGB - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Einführungsgesetz zum Bürgerlichen Gesetzbuche<br />
      <span class="jnenbez">Art 229 § 1</span>&#160;<span class="jnentitel">Überleitungsvorschrift zum Gesetz zur Beschleunigung fälliger Zahlungen</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">(1) § 284 Abs. 3 des Bürgerlichen Gesetzbuchs in der seit dem 1. Mai 2000 geltenden Fassung gilt auch für Geldforderungen, die vor diesem Zeitpunkt entstanden sind.</div>
  </div>
</body>
</html>`;

const egbgbFullHtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>BGBEG - Einführungsgesetz zum Bürgerlichen Gesetzbuche</title>
</head>
<body>
  <div class="jnnorm" id="BJNR006049896">
    <div class="jnheader">
      <h1><span class="jnlangue">Einführungsgesetz zum Bürgerlichen Gesetzbuche</span></h1>
    </div>
  </div>
  <div class="jnnorm" id="BJNR006049896BJNG030900377" title="Gliederung">
    <div class="jnheader">
      <h2><span>Art 1</span><br /><span></span></h2>
    </div>
    <div>
      <div class="jnhtml">
        <div>
          <div class="jurAbsatz">(1) Das Bürgerliche Gesetzbuch tritt am 1. Januar 1900 gleichzeitig mit weiteren Gesetzen in Kraft.</div>
          <div class="jurAbsatz">(2) Landesgesetzliche Vorschriften bleiben in Kraft, soweit die Regelung vorbehalten ist.</div>
        </div>
      </div>
    </div>
  </div>
  <div class="jnnorm" id="BJNR006049896BJNG031000377" title="Gliederung">
    <div class="jnheader">
      <h2><span>Art 2</span><br /><span></span></h2>
    </div>
    <div>
      <div class="jnhtml">
        <div>
          <div class="jurAbsatz">Gesetz im Sinne des Bürgerlichen Gesetzbuchs und dieses Gesetzes ist jede Rechtsnorm.</div>
        </div>
      </div>
    </div>
  </div>
  <div class="jnnorm" id="BJNR006049896BJNG031108360" title="Gliederung">
    <div class="jnheader">
      <h2><span>Art 3</span><br /><span>Anwendungsbereich; Verhältnis zu Regelungen der Europäischen Union</span></h2>
    </div>
    <div>
      <div class="jnhtml">
        <div>
          <div class="jurAbsatz">Soweit nicht unmittelbar anwendbare Regelungen der Europäischen Union maßgeblich sind, bestimmt sich das anzuwendende Recht nach diesem Kapitel.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const hgb1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Handelsgesetzbuch",
  lawCode: "HGB",
  section: "1",
  text: "(1) Kaufmann im Sinne dieses Gesetzbuchs ist, wer ein Handelsgewerbe betreibt.",
});

const zpo1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Zivilprozessordnung",
  lawCode: "ZPO",
  section: "1",
  heading: "Sachliche Zuständigkeit",
  text: "Die sachliche Zuständigkeit der Gerichte wird durch das Gesetz über die Gerichtsverfassung bestimmt.",
});

const vwvfg1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Verwaltungsverfahrensgesetz (VwVfG)",
  lawCode: "VwVfG",
  section: "1",
  heading: "Anwendungsbereich",
  text: "(1) Dieses Gesetz gilt für die öffentlich-rechtliche Verwaltungstätigkeit der Behörden des Bundes.",
});

const stag1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Staatsangehörigkeitsgesetz (StAG)",
  lawCode: "StAG",
  section: "1",
  text: "Deutscher im Sinne dieses Gesetzes ist, wer die deutsche Staatsangehörigkeit besitzt.",
});

const kagb1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Kapitalanlagegesetzbuch",
  lawCode: "KAGB",
  section: "1",
  text: "Dieses Gesetz gilt für Investmentvermögen und deren Verwaltungsgesellschaften.",
});

const gwg10HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Geldwäschegesetz (GwG)",
  lawCode: "GwG",
  section: "10",
  heading: "Allgemeine Sorgfaltspflichten",
  text: "(1) Die Verpflichteten müssen die allgemeinen Sorgfaltspflichten erfüllen.",
});

const sgbV1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Sozialgesetzbuch (SGB) Fünftes Buch (V) - Gesetzliche Krankenversicherung",
  lawCode: "SGB V",
  section: "1",
  heading: "Solidarität und Eigenverantwortung",
  text: "Die Krankenversicherung als Solidargemeinschaft hat die Aufgabe, die Gesundheit der Versicherten zu erhalten.",
});

const sgbIX1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Sozialgesetzbuch (SGB) Neuntes Buch (IX) - Rehabilitation und Teilhabe von Menschen mit Behinderungen",
  lawCode: "SGB IX",
  section: "1",
  heading: "Selbstbestimmung und Teilhabe am Leben in der Gesellschaft",
  text: "Menschen mit Behinderungen oder von Behinderung bedrohte Menschen erhalten Leistungen nach diesem Buch.",
});

const genericHeadingFixture = makeSectionHtmlFixture({
  lawTitle: "Beispielgesetz",
  lawCode: "BspG",
  section: "1",
  heading: "Beispielüberschrift",
  text: "Beispieltext.",
});

describe("GesetzeImInternet mapping helpers", () => {
  it("builds section URLs for all supported mapped laws", () => {
    const cases: Array<{
      lawCode: string;
      section: string;
      subsection?: string;
      referenceType?: LawReference["referenceType"];
      expectedUrl: string;
    }> = [
      { lawCode: "AO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/ao_1977/__1.html" },
      { lawCode: "AKTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/aktg/__1.html" },
      { lawCode: "ARBGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/arbgg/__1.html" },
      { lawCode: "ASYLG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/asylvfg_1992/__1.html" },
      { lawCode: "AUFENTHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/aufenthg_2004/__1.html" },
      { lawCode: "BGB", section: "823", expectedUrl: "https://www.gesetze-im-internet.de/bgb/__823.html" },
      { lawCode: "BETRVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/betrvg/__1.html" },
      { lawCode: "BURLG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/burlg/__1.html" },
      {
        lawCode: "EGBGB",
        section: "1",
        referenceType: "article",
        expectedUrl: "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html",
      },
      {
        lawCode: "EGBGB",
        section: "229",
        subsection: "6",
        referenceType: "article",
        expectedUrl: "https://www.gesetze-im-internet.de/bgbeg/art_229__6.html",
      },
      {
        lawCode: "EGBGB",
        section: "229",
        subsection: "67",
        referenceType: "article",
        expectedUrl: "https://www.gesetze-im-internet.de/bgbeg/art_229__67.html",
      },
      {
        lawCode: "EGBGB",
        section: "246a",
        subsection: "1",
        referenceType: "article",
        expectedUrl: "https://www.gesetze-im-internet.de/bgbeg/art_246a__1.html",
      },
      {
        lawCode: "EGBGB",
        section: "247",
        subsection: "3",
        referenceType: "article",
        expectedUrl: "https://www.gesetze-im-internet.de/bgbeg/art_247__3.html",
      },
      { lawCode: "ESTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/estg/__1.html" },
      { lawCode: "FAMFG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/famfg/__1.html" },
      { lawCode: "FGO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/fgo/__1.html" },
      { lawCode: "GEWSTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gewstg/__1.html" },
      { lawCode: "GG", section: "1", referenceType: "article", expectedUrl: "https://www.gesetze-im-internet.de/gg/art_1.html" },
      { lawCode: "GMBHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gmbhg/__1.html" },
      { lawCode: "GVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gvg/__1.html" },
      { lawCode: "GWG", section: "10", expectedUrl: "https://www.gesetze-im-internet.de/gwg_2017/__10.html" },
      { lawCode: "HGB", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/hgb/__1.html" },
      { lawCode: "INSO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/inso/__1.html" },
      { lawCode: "JGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/jgg/__1.html" },
      { lawCode: "KAGB", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kagb/__1.html" },
      { lawCode: "KSCHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kschg/__1.html" },
      { lawCode: "KSTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kstg_1977/__1.html" },
      { lawCode: "PAUSWG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/pauswg/__1.html" },
      { lawCode: "SGB I", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_1/__1.html" },
      { lawCode: "SGB II", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_2/__1.html" },
      { lawCode: "SGB III", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_3/__1.html" },
      { lawCode: "SGB IV", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_4/__1.html" },
      { lawCode: "SGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgg/__1.html" },
      { lawCode: "SGB V", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_5/__1.html" },
      { lawCode: "SGB VI", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_6/__1.html" },
      { lawCode: "SGB VII", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_7/__1.html" },
      { lawCode: "SGB VIII", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_8/__1.html" },
      { lawCode: "SGB IX", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_9_2018/__1.html" },
      { lawCode: "SGB X", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_10/__1.html" },
      { lawCode: "SGB XI", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_11/__1.html" },
      { lawCode: "SGB XII", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_12/__1.html" },
      { lawCode: "SGB XIV", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/sgb_14/__1.html" },
      { lawCode: "STAG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/stag/__1.html" },
      { lawCode: "STGB", section: "242", expectedUrl: "https://www.gesetze-im-internet.de/stgb/__242.html" },
      { lawCode: "STPO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/stpo/__1.html" },
      { lawCode: "TZBFG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/tzbfg/__1.html" },
      { lawCode: "UMWG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/umwg_1995/__1.html" },
      { lawCode: "USTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/ustg_1980/__1.html" },
      { lawCode: "VWGO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/vwgo/__1.html" },
      { lawCode: "VWVFG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/vwvfg/__1.html" },
      { lawCode: "WPHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/wphg/__1.html" },
      { lawCode: "ZPO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/zpo/__1.html" },
      { lawCode: "ZVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/zvg/__1.html" },
    ];

    for (const testCase of cases) {
      assert.equal(
        buildGesetzeImInternetSectionUrl({
          lawCode: testCase.lawCode,
          section: testCase.section,
          subsection: testCase.subsection,
          referenceType: testCase.referenceType as LawReference["referenceType"],
        }),
        testCase.expectedUrl,
      );
    }
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

  it("excludes Gesetze im Internet navigation, footer, and script artifacts", () => {
    const text = extractGesetzeImInternetPlainText(bgb823HtmlFixture);

    assert.match(text, /\(1\) Wer vorsätzlich oder fahrlässig das Leben/);
    assert.match(text, /\(2\) Die gleiche Verpflichtung trifft denjenigen/);
    assert.doesNotMatch(text, /zum Seitenanfang/);
    assert.doesNotMatch(text, /Impressum/);
    assert.doesNotMatch(text, /Datenschutz/);
    assert.doesNotMatch(text, /Barrierefreiheitserklärung/);
    assert.doesNotMatch(text, /Feedback-Formular/);
    assert.doesNotMatch(text, /Seite ausdrucken/);
    assert.doesNotMatch(text, /CDATA/);
    assert.doesNotMatch(text, /window\.printLinksEnabled/);
    assert.doesNotMatch(text, /\/\*/);
    assert.doesNotMatch(text, /\/\/-->/);
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
    assert.match(section.text, /\(2\) Die gleiche Verpflichtung trifft denjenigen/);
    assert.doesNotMatch(section.text, /Impressum|Datenschutz|zum Seitenanfang/);
  });

  it("maps GG Art. 1 into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "GG", section: "1", referenceType: "article" },
      html: ggArt1HtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/gg/art_1.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-20T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "GG");
    assert.equal(section.lawTitle, "Grundgesetz für die Bundesrepublik Deutschland");
    assert.equal(section.referenceType, "article");
    assert.equal(section.section, "1");
    assert.equal(section.sourceUrl, "https://www.gesetze-im-internet.de/gg/art_1.html");
    assert.match(section.text, /^\(1\) Die Würde des Menschen ist unantastbar\./);
  });

  it("maps EGBGB Art. 1 from the official full-law HTML into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "EGBGB", section: "1", referenceType: "article" },
      html: egbgbFullHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-21T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "EGBGB");
    assert.equal(section.lawTitle, "Einführungsgesetz zum Bürgerlichen Gesetzbuche");
    assert.equal(section.referenceType, "article");
    assert.equal(section.section, "1");
    assert.equal(section.subsection, undefined);
    assert.equal(section.sourceUrl, "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html");
    assert.match(section.text, /^\(1\) Das Bürgerliche Gesetzbuch tritt am 1\. Januar 1900/);
    assert.match(section.text, /\(2\) Landesgesetzliche Vorschriften bleiben in Kraft/);
    assert.doesNotMatch(section.text, /jede Rechtsnorm/);
  });

  it("maps titled EGBGB pure articles from the official full-law HTML", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "EGBGB", section: "3", referenceType: "article" },
      html: egbgbFullHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-21T00:00:00.000Z",
    });

    assert.equal(section.section, "3");
    assert.match(section.text, /^Soweit nicht unmittelbar anwendbare Regelungen/);
    assert.doesNotMatch(section.text, /Das Bürgerliche Gesetzbuch tritt/);
  });

  it("maps EGBGB Art. 229 § 1 into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "EGBGB", section: "229", subsection: "1", referenceType: "article" },
      html: egbgbArt229Sec1HtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/bgbeg/art_229__1.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-21T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "EGBGB");
    assert.equal(section.lawTitle, "Einführungsgesetz zum Bürgerlichen Gesetzbuche");
    assert.equal(section.referenceType, "article");
    assert.equal(section.section, "229");
    assert.equal(section.subsection, "1");
    assert.equal(section.sourceUrl, "https://www.gesetze-im-internet.de/bgbeg/art_229__1.html");
    assert.equal(section.heading, "Überleitungsvorschrift zum Gesetz zur Beschleunigung fälliger Zahlungen");
    assert.match(section.text, /^\(1\) § 284 Abs\. 3 des Bürgerlichen Gesetzbuchs/);
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

  it("maps canonical display law codes for mixed-case official abbreviations", () => {
    const cases = [
      { lawCode: "STGB", expectedDisplayLawCode: "StGB" },
      { lawCode: "STPO", expectedDisplayLawCode: "StPO" },
      { lawCode: "VWVFG", expectedDisplayLawCode: "VwVfG" },
      { lawCode: "VWGO", expectedDisplayLawCode: "VwGO" },
      { lawCode: "STAG", expectedDisplayLawCode: "StAG" },
      { lawCode: "AUFENTHG", expectedDisplayLawCode: "AufenthG" },
      { lawCode: "GMBHG", expectedDisplayLawCode: "GmbHG" },
      { lawCode: "AKTG", expectedDisplayLawCode: "AktG" },
      { lawCode: "ESTG", expectedDisplayLawCode: "EStG" },
      { lawCode: "USTG", expectedDisplayLawCode: "UStG" },
    ];

    for (const testCase of cases) {
      const section = mapGesetzeImInternetToLawSection({
        reference: { lawCode: testCase.lawCode, section: "1" },
        html: genericHeadingFixture,
        sourceUrl: "https://www.gesetze-im-internet.de/example/__1.html",
        providerId: "gesetze-im-internet",
        providerLabel: "Gesetze im Internet",
        retrievedAt: "2026-05-20T00:00:00.000Z",
      });

      assert.equal(section.lawCode, testCase.expectedDisplayLawCode);
    }
  });

  it("returns stable supported-law diagnostics metadata", () => {
    const supportedLaws = getSupportedGesetzeImInternetLaws();
    const byCode = new Map(supportedLaws.map((law) => [law.displayLawCode, law]));

    assert.equal(byCode.get("BGB")?.lawTitle, "Bürgerliches Gesetzbuch");
    assert.equal(byCode.get("BGB")?.referenceType, "section");
    assert.deepEqual(byCode.get("BGB")?.exampleInputs, [
      "§ 823 BGB",
      "BGB § 823",
      "823 BGB",
      "BGB 823",
    ]);

    assert.equal(byCode.get("StGB")?.displayLawCode, "StGB");
    assert.equal(byCode.get("StGB")?.referenceType, "section");
    assert.deepEqual(byCode.get("StGB")?.exampleInputs, [
      "§ 242 StGB",
      "StGB § 242",
      "242 StGB",
      "StGB 242",
    ]);

    assert.equal(byCode.get("VwVfG")?.displayLawCode, "VwVfG");
    assert.equal(byCode.get("VwVfG")?.referenceType, "section");
    assert.deepEqual(byCode.get("VwVfG")?.exampleInputs, [
      "§ 1 VwVfG",
      "VwVfG § 1",
      "1 VwVfG",
      "VwVfG 1",
    ]);

    assert.equal(byCode.get("SGB V")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB V")?.exampleInputs, [
      "§ 1 SGB V",
      "SGB V § 1",
      "1 SGB V",
      "SGB V 1",
    ]);

    assert.equal(byCode.get("SGB X")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB X")?.exampleInputs, [
      "§ 1 SGB X",
      "SGB X § 1",
      "1 SGB X",
      "SGB X 1",
    ]);

    assert.equal(byCode.get("SGB I")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB I")?.exampleInputs, [
      "§ 1 SGB I",
      "SGB I § 1",
      "1 SGB I",
      "SGB I 1",
    ]);

    assert.equal(byCode.get("SGB II")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB II")?.exampleInputs, [
      "§ 1 SGB II",
      "SGB II § 1",
      "1 SGB II",
      "SGB II 1",
    ]);

    assert.equal(byCode.get("SGB III")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB III")?.exampleInputs, [
      "§ 1 SGB III",
      "SGB III § 1",
      "1 SGB III",
      "SGB III 1",
    ]);

    assert.equal(byCode.get("SGB IV")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB IV")?.exampleInputs, [
      "§ 1 SGB IV",
      "SGB IV § 1",
      "1 SGB IV",
      "SGB IV 1",
    ]);

    assert.equal(byCode.get("GG")?.referenceType, "article");
    assert.deepEqual(byCode.get("GG")?.exampleInputs, [
      "Art. 1 GG",
      "GG Art. 1",
      "Artikel 1 GG",
      "GG Artikel 1",
    ]);

    assert.equal(byCode.get("EGBGB")?.referenceType, "article");
    assert.deepEqual(byCode.get("EGBGB")?.exampleInputs, [
      "Art. 1 EGBGB",
      "EGBGB Art. 1",
      "Art. 229 § 6 EGBGB",
      "EGBGB Artikel 246a § 1",
    ]);

    assert.equal(byCode.get("SGB VI")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB VI")?.exampleInputs, [
      "§ 1 SGB VI",
      "SGB VI § 1",
      "1 SGB VI",
      "SGB VI 1",
    ]);

    assert.equal(byCode.get("SGB VII")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB VII")?.exampleInputs, [
      "§ 1 SGB VII",
      "SGB VII § 1",
      "1 SGB VII",
      "SGB VII 1",
    ]);

    assert.equal(byCode.get("SGB VIII")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB VIII")?.exampleInputs, [
      "§ 1 SGB VIII",
      "SGB VIII § 1",
      "1 SGB VIII",
      "SGB VIII 1",
    ]);

    assert.equal(byCode.get("SGB IX")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB IX")?.exampleInputs, [
      "§ 1 SGB IX",
      "SGB IX § 1",
      "1 SGB IX",
      "SGB IX 1",
    ]);

    assert.equal(byCode.get("SGB XI")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB XI")?.exampleInputs, [
      "§ 1 SGB XI",
      "SGB XI § 1",
      "1 SGB XI",
      "SGB XI 1",
    ]);

    assert.equal(byCode.get("SGB XII")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB XII")?.exampleInputs, [
      "§ 1 SGB XII",
      "SGB XII § 1",
      "1 SGB XII",
      "SGB XII 1",
    ]);

    assert.equal(byCode.get("SGB XIV")?.referenceType, "section");
    assert.deepEqual(byCode.get("SGB XIV")?.exampleInputs, [
      "§ 1 SGB XIV",
      "SGB XIV § 1",
      "1 SGB XIV",
      "SGB XIV 1",
    ]);
  });
});

describe("GesetzeImInternetProvider", () => {
  it("returns null for unsupported law code without fetching", async () => {
    let calls = 0;
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      calls += 1;
      return textResponse(bgb823HtmlFixture);
    });

    assert.equal(await provider.getSection({ lawCode: "XYZ", section: "1" }), null);
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

  it("resolves StGB § 242 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(stgb242HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "STGB", section: "242" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "StGB");
    assert.equal(section?.lawTitle, "Strafgesetzbuch");
    assert.equal(section?.heading, "Diebstahl");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/stgb/__242.html");
    assert.match(section?.text ?? "", /^\(1\) Wer eine fremde bewegliche Sache/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/stgb/__242.html"]);
  });

  it("resolves SGB V § 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(sgbV1HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "SGB V", section: "1" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "SGB V");
    assert.equal(section?.lawTitle, "Sozialgesetzbuch (SGB) Fünftes Buch (V) - Gesetzliche Krankenversicherung");
    assert.equal(section?.heading, "Solidarität und Eigenverantwortung");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/sgb_5/__1.html");
    assert.match(section?.text ?? "", /^Die Krankenversicherung als Solidargemeinschaft hat die Aufgabe/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/sgb_5/__1.html"]);
  });

  it("resolves SGB IX § 1 from fixture-backed fetch via sgb_9_2018", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(sgbIX1HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "SGB IX", section: "1" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "SGB IX");
    assert.equal(section?.lawTitle, "Sozialgesetzbuch (SGB) Neuntes Buch (IX) - Rehabilitation und Teilhabe von Menschen mit Behinderungen");
    assert.equal(section?.heading, "Selbstbestimmung und Teilhabe am Leben in der Gesellschaft");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/sgb_9_2018/__1.html");
    assert.match(section?.text ?? "", /^Menschen mit Behinderungen oder von Behinderung bedrohte Menschen/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/sgb_9_2018/__1.html"]);
  });

  it("resolves GG Art. 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(ggArt1HtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "GG");
    assert.equal(section?.lawTitle, "Grundgesetz für die Bundesrepublik Deutschland");
    assert.equal(section?.referenceType, "article");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/gg/art_1.html");
    assert.equal(section?.heading, undefined);
    assert.match(section?.text ?? "", /^\(1\) Die Würde des Menschen ist unantastbar\./);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/gg/art_1.html"]);
  });

  it("resolves EGBGB Art. 229 § 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(egbgbArt229Sec1HtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "EGBGB");
    assert.equal(section?.lawTitle, "Einführungsgesetz zum Bürgerlichen Gesetzbuche");
    assert.equal(section?.referenceType, "article");
    assert.equal(section?.section, "229");
    assert.equal(section?.subsection, "1");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/bgbeg/art_229__1.html");
    assert.equal(section?.heading, "Überleitungsvorschrift zum Gesetz zur Beschleunigung fälliger Zahlungen");
    assert.match(section?.text ?? "", /^\(1\) § 284 Abs\. 3 des Bürgerlichen Gesetzbuchs/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/bgbeg/art_229__1.html"]);
  });

  it("resolves EGBGB Art. 1 from fixture-backed full-law fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(egbgbFullHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
    });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "EGBGB");
    assert.equal(section?.lawTitle, "Einführungsgesetz zum Bürgerlichen Gesetzbuche");
    assert.equal(section?.referenceType, "article");
    assert.equal(section?.section, "1");
    assert.equal(section?.subsection, undefined);
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html");
    assert.match(section?.text ?? "", /^\(1\) Das Bürgerliche Gesetzbuch tritt am 1\. Januar 1900/);
    assert.doesNotMatch(section?.text ?? "", /jede Rechtsnorm/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/bgbeg/BJNR006049896.html"]);
  });

  it("returns null when an EGBGB pure article is absent from the full-law HTML", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => (
      textResponse(egbgbFullHtmlFixture)
    ));

    assert.equal(
      await provider.getSection({
        lawCode: "EGBGB",
        section: "999",
        referenceType: "article",
      }),
      null,
    );
  });

  it("resolves representative verified mapped laws from fixtures", async () => {
    const cases = [
      {
        lawCode: "HGB",
        section: "1",
        fixture: hgb1HtmlFixture,
        expectedLawCode: "HGB",
        expectedLawTitle: "Handelsgesetzbuch",
        expectedHeading: "",
        expectedUrl: "https://www.gesetze-im-internet.de/hgb/__1.html",
      },
      {
        lawCode: "ZPO",
        section: "1",
        fixture: zpo1HtmlFixture,
        expectedLawCode: "ZPO",
        expectedLawTitle: "Zivilprozessordnung",
        expectedHeading: "Sachliche Zuständigkeit",
        expectedUrl: "https://www.gesetze-im-internet.de/zpo/__1.html",
      },
      {
        lawCode: "VWVFG",
        section: "1",
        fixture: vwvfg1HtmlFixture,
        expectedLawCode: "VwVfG",
        expectedLawTitle: "Verwaltungsverfahrensgesetz",
        expectedHeading: "Anwendungsbereich",
        expectedUrl: "https://www.gesetze-im-internet.de/vwvfg/__1.html",
      },
      {
        lawCode: "STAG",
        section: "1",
        fixture: stag1HtmlFixture,
        expectedLawCode: "StAG",
        expectedLawTitle: "Staatsangehörigkeitsgesetz",
        expectedHeading: "",
        expectedUrl: "https://www.gesetze-im-internet.de/stag/__1.html",
      },
      {
        lawCode: "KAGB",
        section: "1",
        fixture: kagb1HtmlFixture,
        expectedLawCode: "KAGB",
        expectedLawTitle: "Kapitalanlagegesetzbuch",
        expectedHeading: "",
        expectedUrl: "https://www.gesetze-im-internet.de/kagb/__1.html",
      },
      {
        lawCode: "GWG",
        section: "10",
        fixture: gwg10HtmlFixture,
        expectedLawCode: "GwG",
        expectedLawTitle: "Geldwäschegesetz",
        expectedHeading: "Allgemeine Sorgfaltspflichten",
        expectedUrl: "https://www.gesetze-im-internet.de/gwg_2017/__10.html",
      },
    ];

    for (const testCase of cases) {
      const requestedUrls: string[] = [];
      const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
        requestedUrls.push(url);
        return textResponse(testCase.fixture);
      });

      const section = await provider.getSection({
        lawCode: testCase.lawCode,
        section: testCase.section,
      });

      assert.equal(section?.providerId, "gesetze-im-internet");
      assert.equal(section?.lawCode, testCase.expectedLawCode);
      assert.equal(section?.lawTitle, testCase.expectedLawTitle);
      assert.equal(section?.heading, testCase.expectedHeading);
      assert.equal(section?.sourceUrl, testCase.expectedUrl);
      assert.deepEqual(requestedUrls, [testCase.expectedUrl]);
    }
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
      json: async () => ({}),
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
      json: async () => ({}),
      text: async () => "",
    }));

    assert.equal(await provider.getSection({ lawCode: "BGB", section: "99999" }), null);
  });

  it("throws provider failure for 500 responses", async () => {
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
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
    json: async () => ({}),
    text: async () => body,
  };
}

function makeSectionHtmlFixture(params: {
  lawTitle: string;
  lawCode: string;
  section: string;
  heading?: string;
  text: string;
}): string {
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; ${params.section} ${params.lawCode} - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>${params.lawTitle}<br />
      <span class="jnenbez">&#167; ${params.section}</span>&#160;<span class="jnentitel">${params.heading ?? ""}</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">${params.text}</div>
  </div>
</body>
</html>`;
}
