import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { LawProviderUnavailableError } from "../src/law/errors";
import { RisLawProvider } from "../src/law/providers/RisLawProvider";
import {
  buildRisSectionUrl,
  extractRisHeading,
  extractRisPlainText,
  extractRisMetadata,
  extractRisErvArticleEnglish,
  extractRisErvHeading,
  getSupportedRisLaws,
  mapRisErvToLawSection,
  mapRisToLawSection,
} from "../src/law/providers/risMapping";

const abgb1295HtmlFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - ABGB § 1295</title></head>
<body>
<div id="tabContent">
<h1>Allgemeines bürgerliches Gesetzbuch<br/>§ 1295 Schadenersatz</h1>
<p>(1) Jedermann ist berechtigt, von dem Schädiger den Ersatz des Schadens, den dieser ihm durch ein Verschulden zugefügt hat, zu fordern.</p>
<p>(2) Der Schadenersatz kann auch für den Schaden verlangt werden, den jemand ohne Verschulden zugefügt hat, wenn der Ersatzpflichtige dennoch aus Billigkeit zum Ersatz verpflichtet ist.</p>
</div>
Bundesrecht konsolidiert; Informationsfassung, rechtlich unverbindlich
Gesetzesnummer: 10001622
Dokumentnummer: NOR12012345
Zuletzt aktualisiert am: 01.01.2026
</body>
</html>`;

const abgb1294HtmlFixture = `<!DOCTYPE html>
<html lang="en">
<head><title>RIS - ABGB § 1294</title></head>
<body>
<div id="tabContent">
<h1>Allgemeines bürgerliches Gesetzbuch<br/>§ 1294 Begriff des Schadens</h1>
<p>Schaden heißt jeder Nachteil, welcher einer Person an Vermögen, Rechten oder ihrer Person zugefügt worden ist. Schadenersatz ist die Wiederherstellung des früheren Zustandes oder der vom Gesetz bestimmte Ausgleich.</p>
</div>
Bundesrecht konsolidiert; Informationsfassung, rechtlich unverbindlich
Gesetzesnummer: 10001622
Dokumentnummer: NOR12012346
Zuletzt aktualisiert am: 15.03.2026
</body>
</html>`;

const stgb75HtmlFixture = `<!DOCTYPE html>
<html lang="en">
<head><title>RIS - StGB § 75</title></head>
<body>
<div id="tabContent">
<h1>Strafgesetzbuch<br/>§ 75 Mord</h1>
<p>Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen.</p>
</div>
Bundesrecht konsolidiert; Informationsfassung, rechtlich unverbindlich
Gesetzesnummer: 10002296
Dokumentnummer: NOR12123456
Zuletzt aktualisiert am: 01.01.2026
</body>
</html>`;

const historicalStgb75HtmlFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - StGB § 75</title></head>
<body>
<div id="tabContent">
<h1>Strafgesetzbuch<br/>§. 75.Paragraph 75, Mord</h1>
<p>(1) Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen.</p>
</div>
</body>
</html>`;

const historicalStgb75HtmlMultiLineFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - StGB § 75</title></head>
<body>
<div id="tabContent">
<h1>Strafgesetzbuch<br/>§. 75.<br/>Paragraph 75,<br/>Mord</h1>
<p>(1) Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen.</p>
</div>
</body>
</html>`;

const dedupLabelHtmlFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - StGB § 75</title></head>
<body>
<div id="tabContent">
<h1>Strafgesetzbuch<br/>§ 75 Mord</h1>
Paragraph 75,
<p>(1) Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen.</p>
</div>
</body>
</html>`;


const liveLikeStgb75HtmlFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - StGB § 75</title></head>
<body>
<script type="text/javascript">
SmartPage_Initialize();
StyleUtility.CreateBorderSpans('#Header_MainNavigation_RisTabbedMenu_MainMenuTabStrip_BundesrechtTab > *:first');
</script>
<style type="text/css">body { font-family: Arial, sans-serif; }</style>
<noscript>Sie sind dabei, die Seite zu verlassen.</noscript>
<a href="#content">Zum Inhalt</a>
<div id="navigation">
  Navigationsleiste:
  <a href="/">Bund</a>
  <a href="/Landesrecht">Länder</a>
  <a href="/Judikatur">Judikatur</a>
  <a href="/Gesamtabfrage">Gesamtabfrage</a>
</div>
<h1>Bundesrecht konsolidiert: Strafgesetzbuch &#167; 75, tagesaktuelle Fassung</h1>
<div class="adjacent">
  <a href="#p74">§ 74 am 09.07.2026</a>
  <a href="#p76">§ 76 am 09.07.2026</a>
  <span>Alle Fassungen</span>
</div>
<div class="document">
  <div>Text</div>
  <div>Besonderer Teil</div>
  <div>Erster Abschnitt</div>
  <div>Strafbare Handlungen gegen Leib und Leben</div>
  <div>Mord</div>
  <div>§&nbsp;75.  Paragraph 75,</div>
  <p>Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen.</p>
  <div>Schlagworte</div>
  <div>Umbringen</div>
  <div>Zuletzt aktualisiert am</div>
  <div>14.09.2015</div>
  <div>Gesetzesnummer</div>
  <div>10002296</div>
  <div>Dokumentnummer</div>
  <div>NOR12029618</div>
  <div>Alte Dokumentnummer</div>
  <div>N2197415070T</div>
  <div>https://www.ris.bka.gv.at/eli/bgbl/1974/60/P75/NOR12029618</div>
  <div>Zum Seitenanfang</div>
  <div>Über diese Seite</div>
  <div>© 2026 Bundeskanzleramt der Republik Österreich</div>
</div>
</body>
</html>`;

const zpo1HtmlFixture = `<!DOCTYPE html>
<html lang="de">
<head><title>RIS - ZPO § 1</title></head>
<body>
<div id="tabContent">
<h1>Zivilprozessordnung<br/>§ 1 Begriff der bürgerlichen Rechtssachen</h1>
<p>Die Zivilprozessordnung regelt das Verfahren in bürgerlichen Rechtssachen vor den ordentlichen Gerichten.</p>
</div>
Bundesrecht konsolidiert; Informationsfassung, rechtlich unverbindlich
Gesetzesnummer: 10001699
Dokumentnummer: NOR12012901
Zuletzt aktualisiert am: 01.01.2026
</body>
</html>`;

const bvg144HtmlFixture = `<!DOCTYPE html>
<html lang="en">
<head><title>RIS - B-VG Art. 144</title></head>
<body>
<div id="tabContent">
<h1>Bundes-Verfassungsgesetz<br/>Artikel 144</h1>
<p>(1) Der Verfassungsgerichtshof erkennt über Beschwerden gegen Bescheide der Verwaltungsgerichte.</p>
<p>(2) Soweit die Beschwerde nicht bereits abzulehnen oder zurückzuweisen ist, hat der Verfassungsgerichtshof dem Beschwerdeführer die Beschwerde unter Setzung einer angemessenen Frist zur Verbesserung zurückzustellen.</p>
</div>
Bundesrecht konsolidiert; Informationsfassung, rechtlich unverbindlich
Gesetzesnummer: 10000138
Dokumentnummer: NOR13123456
Zuletzt aktualisiert am: 01.01.2026
</body>
</html>`;

const ervBvgHtmlFixture = `<!DOCTYPE html>
<html lang="en">
<head><title>RIS Dokument</title></head>
<body>
<div class="Header_MainNavigation"><a href="#content">Zum Inhalt</a> <a href="/">Startseite</a> <a href="/Dokumente">RIS Dokument</a></div>
<table>
<tr><td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="ParagraphMitAbsatzzahl"><div class="GldSymbolFloatLeft AlignJustify"><h3 class="GldSymbol AlignJustify">Artikel 144.</h3></div><ol class="wai-absatz-list"><li><div class="content"><div class="Abs_small_indent AlignJustify"><span aria-hidden="true" class="Absatzzahl">(1)</span><span class="sr-only">Absatz eins,</span><span>Der Verfassungsgerichtshof erkennt über Beschwerden gegen das Erkenntnis eines Verwaltungsgerichtes, soweit der Beschwerdeführer durch das Erkenntnis in einem verfassungsgesetzlich gewährleisteten Recht verletzt zu sein behauptet.</span></div></div></li><li><div class="content"><div class="Abs_small_indent AlignJustify"><span aria-hidden="true" class="Absatzzahl">(2)</span><span class="sr-only">Absatz zwei,</span><span>Der Verfassungsgerichtshof kann dem Beschwerdeführer die Beschwerde unter Setzung einer angemessenen Frist zur Verbesserung zurückstellen.</span></div></div></li></ol></div></td>
<td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="ParagraphMitAbsatzzahl"><div class="GldSymbolFloatLeft AlignJustify"><h3 class="GldSymbol AlignJustify"><span style="font-weight:normal;"><span class="Fett">Article </span></span>144.</h3></div><ol class="wai-absatz-list"><li><div class="content"><div class="Abs_small_indent AlignJustify"><span aria-hidden="true" class="Absatzzahl">(1)</span><span class="sr-only">Absatz eins,</span><span>The Constitutional Court shall rule on complaints against rulings of administrative courts, where the complainant alleges that the ruling has infringed any of their constitutionally guaranteed rights.</span></div></div></li><li><div class="content"><div class="Abs_small_indent AlignJustify"><span aria-hidden="true" class="Absatzzahl">(2)</span><span class="sr-only">Absatz zwei,</span><span>The Constitutional Court may, instead of dismissing or rejecting the complaint, request the complainant to amend it within an appropriate period.</span></div></div></li></ol></div></td></tr>
<tr><td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="Abs_small_indent AlignJustify"><span>Findet der Verfassungsgerichtshof die Beschwerde nicht zulässig, so weist er sie zurück.</span></div></td><td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="Abs_small_indent AlignJustify"><span>If the Constitutional Court does not consider the complaint admissible, it shall dismiss it.</span></div></td></tr>
<tr><td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="GldSymbolFloatLeft AlignJustify"><h3 class="GldSymbol AlignJustify">Artikel 145.</h3></div></td><td style="vertical-align:top;padding:0pt 5.4pt 0pt 5.4pt;"><div class="GldSymbolFloatLeft AlignJustify"><h3 class="GldSymbol AlignJustify"><span style="font-weight:normal;"><span class="Fett">Article </span></span>145.</h3></div></td></tr>
</table>
</body>
</html>`;

describe("RIS mapping helpers", () => {
  it("builds ABGB § 1295 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "ABGB",
        section: "1295",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=1295",
    );
  });

  it("builds ABGB § 1294 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "ABGB",
        section: "1294",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=1294",
    );
  });

  it("builds AT StGB § 75 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "STGB",
        section: "75",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002296&Paragraf=75",
    );
  });

  it("builds B-VG Art. 144 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "B-VG",
        section: "144",
        referenceType: "article",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000138&Artikel=144",
    );
  });

  it("builds AT ZPO § 1 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "ZPO",
        section: "1",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001699&Paragraf=1",
    );
  });

  it("builds AT JN § 1 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "JN",
        section: "1",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001697&Paragraf=1",
    );
  });

  it("builds AT EO § 1 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "EO",
        section: "1",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001700&Paragraf=1",
    );
  });

  it("builds AT UGB § 1 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "UGB",
        section: "1",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001702&Paragraf=1",
    );
  });

  it("builds AT StPO § 1 URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "StPO",
        section: "1",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002326&Paragraf=1",
    );
  });

  it("returns null for non-AT references", () => {
    assert.equal(
      buildRisSectionUrl({ lawCode: "ABGB", section: "1295" }),
      null,
    );
  });

  it("returns null for unsupported law codes", () => {
    assert.equal(
      buildRisSectionUrl({ lawCode: "BGB", section: "823", jurisdiction: "AT" }),
      null,
    );
  });

  it("extracts heading from ABGB HTML fixture", () => {
    assert.equal(extractRisHeading(abgb1295HtmlFixture), "Schadenersatz");
  });

  it("extracts heading from historical §. N.Paragraph N, form (one line)", () => {
    assert.equal(
      extractRisHeading(historicalStgb75HtmlFixture),
      "Mord",
    );
  });

  it("extracts heading from historical §. N.Paragraph N, form (multi-line)", () => {
    assert.equal(
      extractRisHeading(historicalStgb75HtmlMultiLineFixture),
      "Mord",
    );
  });


  it("extracts heading from live-like RIS StGB § 75 fallback page", () => {
    assert.equal(extractRisHeading(liveLikeStgb75HtmlFixture), "Mord");
  });

  it("extracts plain text from ABGB § 1295 fixture", () => {
    const text = extractRisPlainText(abgb1295HtmlFixture);

    assert.match(text, /\(1\) Jedermann ist berechtigt/);
    assert.match(text, /\(2\) Der Schadenersatz kann auch/);
    assert.doesNotMatch(text, /Zuletzt aktualisiert am/);
    assert.doesNotMatch(text, /Gesetzesnummer/);
    assert.doesNotMatch(text, /Dokumentnummer/);
    assert.doesNotMatch(text, /European Legislation Identifier/);
    assert.doesNotMatch(text, /Bundesrecht konsolidiert/);
  });

  it("removes metadata, ELI, and update lines from RIS text", () => {
    const html = `<!DOCTYPE html><html lang="de"><body><div id="tabContent"><h1>Strafgesetzbuch<br/>§ 75 Mord</h1><p>Wer einen anderen tötet, ist mit Freiheitsstrafe zu bestrafen.</p></div>European Legislation Identifier (ELI): foo<br/>Gesetzesnummer: 10002296<br/>Dokumentnummer: NOR12123456<br/>Zuletzt aktualisiert am: 01.01.2026</body></html>`;

    const text = extractRisPlainText(html);

    assert.match(text, /Wer einen anderen tötet/);
    assert.doesNotMatch(text, /Zuletzt aktualisiert am/);
    assert.doesNotMatch(text, /Gesetzesnummer/);
    assert.doesNotMatch(text, /Dokumentnummer/);
    assert.doesNotMatch(text, /European Legislation Identifier/);
  });

  it("removes metadata from RIS fallback body without tabContent", () => {
    const html = `<!DOCTYPE html><html lang="de"><body>
<h1>Allgemeines bürgerliches Gesetzbuch<br/>§ 1295 Schadenersatz</h1>
<p>(1) Jedermann ist berechtigt, von dem Schädiger den Ersatz des Schadens, den dieser ihm durch ein Verschulden zugefügt hat, zu fordern.</p>
<span>European Legislation Identifier (ELI): foo</span>
Gesetzesnummer: 10001622
Dokumentnummer: NOR12012345
Zuletzt aktualisiert am: 01.01.2026
</body></html>`;

    const text = extractRisPlainText(html);

    assert.match(text, /\(1\) Jedermann ist berechtigt/);
    assert.doesNotMatch(text, /Zuletzt aktualisiert am/);
    assert.doesNotMatch(text, /Gesetzesnummer/);
    assert.doesNotMatch(text, /Dokumentnummer/);
    assert.doesNotMatch(text, /European Legislation Identifier/);
  });


  it("extracts only norm text from live-like RIS StGB § 75 fallback page", () => {
    const text = extractRisPlainText(liveLikeStgb75HtmlFixture);

    assert.match(
      text,
      /Wer einen anderen tötet, ist mit Freiheitsstrafe von zehn bis zu zwanzig Jahren oder mit lebenslanger Freiheitsstrafe zu bestrafen\./,
    );
    assert.match(text, /^Mord$/m);
    assert.doesNotMatch(text, /SmartPage_Initialize/);
    assert.doesNotMatch(text, /Sie sind dabei, die Seite zu verlassen/);
    assert.doesNotMatch(text, /Navigationsleiste/);
    assert.doesNotMatch(text, /Zum Inhalt/);
    assert.doesNotMatch(text, /Zum Seitenanfang/);
    assert.doesNotMatch(text, /Über diese Seite/);
    assert.doesNotMatch(text, /StyleUtility/);
    assert.doesNotMatch(text, /Schlagworte/);
    assert.doesNotMatch(text, /Zuletzt aktualisiert/);
    assert.doesNotMatch(text, /Gesetzesnummer/);
    assert.doesNotMatch(text, /Dokumentnummer/);
    assert.doesNotMatch(text, /Alte Dokumentnummer/);
    assert.doesNotMatch(text, /European Legislation Identifier/);
    assert.doesNotMatch(text, /NOR12029618/);
    assert.doesNotMatch(text, /Paragraph 75/);
    assert.doesNotMatch(text, /Strafgesetzbuch &#167; 75/);
    assert.doesNotMatch(text, /Besonderer Teil/);
    assert.doesNotMatch(text, /Erster Abschnitt/);
    assert.doesNotMatch(text, /Strafbare Handlungen/);
  });

  it("extracts plain text from ABGB § 1294 fixture", () => {
    const text = extractRisPlainText(abgb1294HtmlFixture);

    assert.match(text, /Schaden heißt jeder Nachteil/);
  });

  it("extracts plain text from StGB § 75 fixture", () => {
    const text = extractRisPlainText(stgb75HtmlFixture);

    assert.match(text, /Wer einen anderen tötet/);
    assert.doesNotMatch(text, /Gesetzesnummer 10002296/);
  });

  it("removes standalone Paragraph N labels from plain text (dedup)", () => {
    const text = extractRisPlainText(dedupLabelHtmlFixture);

    assert.match(text, /Wer einen anderen tötet/);
    assert.match(text, /§ 75 Mord/);
    assert.doesNotMatch(text, /^Paragraph\s*75[,.]?\s*$/m);
  });

  it("extracts plain text from B-VG Art. 144 fixture", () => {
    const text = extractRisPlainText(bvg144HtmlFixture);

    assert.match(text, /\(1\) Der Verfassungsgerichtshof erkennt/);
    assert.match(text, /\(2\) Soweit die Beschwerde/);
  });

  it("maps ABGB § 1295 into LawSection with AT metadata", () => {
    const section = mapRisToLawSection({
      reference: { lawCode: "ABGB", section: "1295", jurisdiction: "AT" },
      html: abgb1295HtmlFixture,
      sourceUrl: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=1295",
      providerId: "ris",
      providerLabel: "RIS / Rechtsinformationssystem des Bundes",
      retrievedAt: "2026-06-01T00:00:00.000Z",
    });

    assert.equal(section.providerId, "ris");
    assert.equal(section.providerLabel, "RIS / Rechtsinformationssystem des Bundes");
    assert.equal(section.lawCode, "ABGB");
    assert.equal(section.lawTitle, "Allgemeines bürgerliches Gesetzbuch");
    assert.equal(section.section, "1295");
    assert.equal(section.jurisdiction, "AT");
    assert.equal(section.heading, "Schadenersatz");
    assert.equal(section.cacheStatus, "live");
    assert.equal(section.isOfficialSource, true);
    assert.equal(section.isAuthoritativeText, false);
    assert.match(section.text, /\(1\) Jedermann ist berechtigt/);
  });

  it("maps StGB § 75 into LawSection with AT jurisdiction", () => {
    const section = mapRisToLawSection({
      reference: { lawCode: "STGB", section: "75", jurisdiction: "AT" },
      html: stgb75HtmlFixture,
      sourceUrl: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002296&Paragraf=75",
      providerId: "ris",
      providerLabel: "RIS / Rechtsinformationssystem des Bundes",
      retrievedAt: "2026-06-01T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "StGB");
    assert.equal(section.lawTitle, "Strafgesetzbuch");
    assert.equal(section.jurisdiction, "AT");
  });

  it("maps B-VG Art. 144 into LawSection with article reference type", () => {
    const section = mapRisToLawSection({
      reference: { lawCode: "B-VG", section: "144", referenceType: "article", jurisdiction: "AT" },
      html: bvg144HtmlFixture,
      sourceUrl: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000138&Artikel=144",
      providerId: "ris",
      providerLabel: "RIS / Rechtsinformationssystem des Bundes",
      retrievedAt: "2026-06-01T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "B-VG");
    assert.equal(section.referenceType, "article");
    assert.equal(section.jurisdiction, "AT");
  });

  it("builds AT B-VG translation-en ERV URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "B-VG",
        section: "144",
        referenceType: "article",
        sourceVariant: "translation-en",
        jurisdiction: "AT",
      }),
      "https://www.ris.bka.gv.at/Dokumente/Erv/ERV_1930_1/ERV_1930_1.html",
    );
  });

  it("returns null for non-B-VG AT translation-en URL", () => {
    assert.equal(
      buildRisSectionUrl({
        lawCode: "ABGB",
        section: "1295",
        sourceVariant: "translation-en",
        jurisdiction: "AT",
      }),
      null,
    );
  });

  it("extracts English article text from ERV B-VG fixture", () => {
    const text = extractRisErvArticleEnglish(ervBvgHtmlFixture, "144");

    assert.match(
      text,
      /The Constitutional Court shall rule on complaints against rulings of administrative courts/,
    );
    assert.match(text, /The Constitutional Court may, instead of dismissing or rejecting the complaint/);
    assert.doesNotMatch(text, /Der Verfassungsgerichtshof kann/);
    assert.doesNotMatch(text, /Findet der Verfassungsgerichtshof/);
    assert.doesNotMatch(text, /Startseite/);
    assert.doesNotMatch(text, /RIS Dokument/);
    assert.doesNotMatch(text, /Absatz eins,/);
  });

  it("preserves ordered RIS rows and safely handles unmatched HTML", () => {
    const html = `<table>
      <tr><td>Deutsch</td><td><h3>Article 144.</h3>First English paragraph.</td></tr>
      <tr><td>Deutsch</td><td>Second English paragraph.</td></tr>
      <tr><td>Only one cell</td></tr>
      <tr><td>Deutsch</td><td><h3>Article 145.</h3>Next article.</td></tr>
    </table>`;

    assert.equal(
      extractRisErvArticleEnglish(html, "144"),
      "First English paragraph.\nSecond English paragraph.",
    );
    assert.equal(extractRisErvArticleEnglish("<tr><td>unclosed", "144"), "");
    assert.equal(extractRisErvArticleEnglish("<table>no matching heading</table>", "144"), "");
  });

  it("extracts English heading from ERV B-VG fixture", () => {
    assert.equal(extractRisErvHeading(ervBvgHtmlFixture, "144"), "Article 144.");
  });

  it("maps ERV B-VG Art. 144 into translation-en LawSection", () => {
    const section = mapRisErvToLawSection({
      reference: { lawCode: "B-VG", section: "144", referenceType: "article", sourceVariant: "translation-en", jurisdiction: "AT" },
      html: ervBvgHtmlFixture,
      sourceUrl: "https://www.ris.bka.gv.at/Dokumente/Erv/ERV_1930_1/ERV_1930_1.html",
      providerId: "ris",
      providerLabel: "RIS / Rechtsinformationssystem des Bundes",
      retrievedAt: "2026-06-01T00:00:00.000Z",
    });

    assert.equal(section.jurisdiction, "AT");
    assert.equal(section.lawCode, "B-VG");
    assert.equal(section.referenceType, "article");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.isOfficialSource, true);
    assert.equal(section.isAuthoritativeText, false);
    assert.equal(section.heading, "Article 144.");
    assert.match(section.text, /The Constitutional Court shall rule on complaints against rulings of administrative courts/);
  });

  it("maps ZPO § 1 into LawSection with AT jurisdiction", () => {
    const section = mapRisToLawSection({
      reference: { lawCode: "ZPO", section: "1", jurisdiction: "AT" },
      html: zpo1HtmlFixture,
      sourceUrl: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001699&Paragraf=1",
      providerId: "ris",
      providerLabel: "RIS / Rechtsinformationssystem des Bundes",
      retrievedAt: "2026-06-01T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "ZPO");
    assert.equal(section.lawTitle, "Zivilprozessordnung");
    assert.equal(section.section, "1");
    assert.equal(section.jurisdiction, "AT");
    assert.equal(section.heading, "Begriff der bürgerlichen Rechtssachen");
    assert.equal(section.referenceType, "section");
    assert.equal(section.cacheStatus, "live");
    assert.equal(section.isOfficialSource, true);
    assert.equal(section.isAuthoritativeText, false);
    assert.match(section.text, /regelt das Verfahren/);
  });

  it("extracts RIS metadata fields from fixture", () => {
    const meta = extractRisMetadata(abgb1295HtmlFixture);

    assert.equal(meta.gesetzesnummer, "10001622");
    assert.equal(meta.dokumentnummer, "NOR12012345");
    assert.equal(meta.zuletztAktualisiert, "01.01.2026");
  });

  describe("15 ordinary new Austrian law URLs", () => {
    const lawUrls: Array<[string, string, string]> = [
      ["AKTG", "10002070", "AktG"],
      ["AVG", "10005768", "AVG"],
      ["BAO", "10003940", "BAO"],
      ["FBG", "10002997", "FBG"],
      ["GEWO", "10007517", "GewO"],
      ["GMBHG", "10001720", "GmbHG"],
      ["IO", "10001736", "IO"],
      ["KARTG", "20004174", "KartG"],
      ["KSCHG", "10002462", "KSchG"],
      ["SPG", "10005792", "SPG"],
      ["VERSVG", "10001979", "VersVG"],
      ["VFGG", "10000245", "VfGG"],
      ["VWGG", "10000795", "VwGG"],
      ["VWGVG", "20008255", "VwGVG"],
      ["ZUSTG", "10005522", "ZustG"],
    ];

    for (const [lawCode, gesetzesnummer, displayCode] of lawUrls) {
      it(`builds AT ${displayCode} § 1 URL`, () => {
        assert.equal(
          buildRisSectionUrl({ lawCode, section: "1", jurisdiction: "AT" }),
          `https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=${gesetzesnummer}&Paragraf=1`,
        );
      });
    }
  });

  describe("DSG composite Article/Paragraph URL rule", () => {
    it("builds DSG § 1 URL with Artikel=1 and Paragraf=1", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "1", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=1&Paragraf=1",
      );
    });

    it("builds DSG § 4 URL with Artikel=2 and Paragraf=4", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "4", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=4",
      );
    });

    it("builds DSG § 35a URL with Artikel=2 and Paragraf=35a", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "35a", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=35a",
      );
    });

    it("builds DSG § 70 URL with Artikel=2 and Paragraf=70", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "70", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=70",
      );
    });

    it("builds DSG § 2 URL with Artikel=2 (will 404)", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "2", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=2",
      );
    });

    it("builds DSG § 3 URL with Artikel=2 (will 404)", () => {
      assert.equal(
        buildRisSectionUrl({ lawCode: "DSG", section: "3", jurisdiction: "AT" }),
        "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597&Artikel=2&Paragraf=3",
      );
    });
  });

  it("returns stable Austrian supported-law diagnostics metadata", () => {
    const laws = getSupportedRisLaws();

    assert.equal(laws.length, 24);

    const sorted = [...laws].sort((a, b) =>
      a.displayLawCode.localeCompare(b.displayLawCode, "de"),
    );
    for (let i = 0; i < laws.length; i++) {
      assert.equal(laws[i], sorted[i]);
    }

    const abgb = laws.find((l) => l.displayLawCode === "ABGB")!;
    assert.equal(abgb.lawTitle, "Allgemeines bürgerliches Gesetzbuch");
    assert.equal(abgb.referenceType, "section");
    assert.ok(abgb.exampleInputs.includes("§ 1295 ABGB"));
    assert.ok(abgb.exampleInputs.includes("ABGB § 1295"));

    const bvg = laws.find((l) => l.displayLawCode === "B-VG")!;
    assert.equal(bvg.lawTitle, "Bundes-Verfassungsgesetz");
    assert.equal(bvg.referenceType, "article");
    assert.ok(bvg.exampleInputs.includes("Art. 144 B-VG"));
    assert.ok(bvg.exampleInputs.includes("B-VG Art. 144"));
  });

  it("includes all 16 new Austrian laws with correct metadata in getSupportedRisLaws", () => {
    const laws = getSupportedRisLaws();
    const byCode = new Map(laws.map((l) => [l.displayLawCode, l]));

    const checks: Array<[string, string, string]> = [
      ["AktG", "Aktiengesetz", "section"],
      ["AVG", "Allgemeines Verwaltungsverfahrensgesetz 1991", "section"],
      ["BAO", "Bundesabgabenordnung", "section"],
      ["DSG", "Datenschutzgesetz", "section"],
      ["FBG", "Firmenbuchgesetz", "section"],
      ["GewO", "Gewerbeordnung 1994", "section"],
      ["GmbHG", "GmbH-Gesetz", "section"],
      ["IO", "Insolvenzordnung", "section"],
      ["KartG", "Kartellgesetz 2005", "section"],
      ["KSchG", "Konsumentenschutzgesetz", "section"],
      ["SPG", "Sicherheitspolizeigesetz", "section"],
      ["VersVG", "Versicherungsvertragsgesetz", "section"],
      ["VfGG", "Verfassungsgerichtshofgesetz 1953", "section"],
      ["VwGG", "Verwaltungsgerichtshofgesetz 1985", "section"],
      ["VwGVG", "Verwaltungsgerichtsverfahrensgesetz", "section"],
      ["ZustG", "Zustellgesetz", "section"],
    ];

    for (const [code, title, refType] of checks) {
      const law = byCode.get(code);
      assert.ok(law, `Missing law ${code} in supported laws`);
      assert.equal(law!.lawTitle, title, `Wrong title for ${code}`);
      assert.equal(law!.referenceType, refType, `Wrong referenceType for ${code}`);
      assert.ok(law!.exampleInputs.includes(`§ 1 ${code}`), `Missing § 1 ${code} example`);
      assert.ok(law!.exampleInputs.includes(`${code} § 1`), `Missing ${code} § 1 example`);
    }
  });
});

describe("RisLawProvider", () => {
  it("returns null for non-AT references", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      text: async () => abgb1295HtmlFixture,
      json: async () => ({}),
    }));

    assert.equal(
      await provider.getSection({ lawCode: "ABGB", section: "1295" }),
      null,
    );
  });

  it("returns null for translation-en references", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      text: async () => abgb1295HtmlFixture,
      json: async () => ({}),
    }));

    assert.equal(
      await provider.getSection({ lawCode: "ABGB", section: "1295", sourceVariant: "translation-en", jurisdiction: "AT" }),
      null,
    );
  });

  it("returns null for unsupported law code", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      text: async () => "<html></html>",
      json: async () => ({}),
    }));

    assert.equal(
      await provider.getSection({ lawCode: "BGB", section: "823", jurisdiction: "AT" }),
      null,
    );
  });

  it("resolves an AT ABGB § 1295 section through fixture-backed fetch", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      text: async () => abgb1295HtmlFixture,
      json: async () => ({}),
    }));

    const section = await provider.getSection({ lawCode: "ABGB", section: "1295", jurisdiction: "AT" });

    assert.notEqual(section, null);
    assert.equal(section!.lawCode, "ABGB");
    assert.equal(section!.heading, "Schadenersatz");
    assert.equal(section!.jurisdiction, "AT");
  });

  it("resolves an AT ZPO § 1 section through fixture-backed fetch", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      text: async () => zpo1HtmlFixture,
      json: async () => ({}),
    }));

    const section = await provider.getSection({ lawCode: "ZPO", section: "1", jurisdiction: "AT" });

    assert.notEqual(section, null);
    assert.equal(section!.lawCode, "ZPO");
    assert.equal(section!.heading, "Begriff der bürgerlichen Rechtssachen");
    assert.equal(section!.jurisdiction, "AT");
  });

  it("resolves an AT B-VG Art. 144 translation-en section through fixture-backed fetch", async () => {
    let fetchedUrl: string | null = null;
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async (url) => {
      fetchedUrl = url;
      return {
        ok: true,
        status: 200,
        text: async () => ervBvgHtmlFixture,
        json: async () => ({}),
      };
    });

    const section = await provider.getSection({
      lawCode: "B-VG",
      section: "144",
      referenceType: "article",
      sourceVariant: "translation-en",
      jurisdiction: "AT",
    });

    assert.equal(fetchedUrl, "https://www.ris.bka.gv.at/Dokumente/Erv/ERV_1930_1/ERV_1930_1.html");
    assert.notEqual(section, null);
    assert.equal(section!.jurisdiction, "AT");
    assert.equal(section!.lawCode, "B-VG");
    assert.equal(section!.referenceType, "article");
    assert.equal(section!.sourceVariant, "translation-en");
    assert.equal(section!.isOfficialSource, true);
    assert.equal(section!.isAuthoritativeText, false);
    assert.match(section!.text, /The Constitutional Court shall rule on complaints against rulings of administrative courts/);
    assert.doesNotMatch(section!.text, /Der Verfassungsgerichtshof kann/);
    assert.doesNotMatch(section!.text, /Findet der Verfassungsgerichtshof/);
  });

  it("returns null on 404", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: false,
      status: 404,
      text: async () => "not found",
      json: async () => ({}),
    }));

    assert.equal(
      await provider.getSection({ lawCode: "ABGB", section: "9999", jurisdiction: "AT" }),
      null,
    );
  });

  it("returns null for DSG § 2 on 404 (existing 404-to-null behavior)", async () => {
    let dsgUrl: string | null = null;
    const provider = new RisLawProvider(
      "https://www.ris.bka.gv.at",
      async (url) => {
        dsgUrl = url;
        return {
          ok: false,
          status: 404,
          text: async () => "not found",
          json: async () => ({}),
        };
      },
    );

    assert.equal(
      await provider.getSection({
        lawCode: "DSG",
        section: "2",
        jurisdiction: "AT",
      }),
      null,
    );
    assert.match(dsgUrl!, /Paragraf=2/);
  });

  it("throws provider failure on non-OK non-404 response", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: false,
      status: 500,
      text: async () => "server error",
      json: async () => ({}),
    }));

    await assert.rejects(
      provider.getSection({ lawCode: "ABGB", section: "1295", jurisdiction: "AT" }),
      LawProviderUnavailableError,
    );
  });

  it("throws provider failure when fetch rejects", async () => {
    const provider = new RisLawProvider("https://www.ris.bka.gv.at", async () => {
      throw new Error("network unavailable");
    });

    await assert.rejects(
      provider.getSection({ lawCode: "ABGB", section: "1295", jurisdiction: "AT" }),
      LawProviderUnavailableError,
    );
  });
});
