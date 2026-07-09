import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { LawProviderUnavailableError } from "../src/law/errors";
import { RisLawProvider } from "../src/law/providers/RisLawProvider";
import {
  buildRisSectionUrl,
  extractRisHeading,
  extractRisPlainText,
  extractRisMetadata,
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