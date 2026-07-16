import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { LawProvider } from "../src/law/LawProvider";
import { ProviderRegistry } from "../src/law/ProviderRegistry";
import { LawProviderUnavailableError } from "../src/law/errors";
import { GesetzeImInternetProvider } from "../src/law/providers/GesetzeImInternetProvider";
import { RisLawProvider } from "../src/law/providers/RisLawProvider";
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

const kwg1HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; 1 KWG - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Gesetz über das Kreditwesen (Kreditwesengesetz - KWG)<br />
      <span class="jnenbez">&#167; 1</span>&#160;<span class="jnentitel">Begriffsbestimmungen; Verordnungsermächtigung</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">(1) Kreditinstitute sind Unternehmen, die Bankgeschäfte gewerbsmäßig oder in einem Umfang betreiben, der einen in kaufmännischer Weise eingerichteten Geschäftsbetrieb erfordert.</div>
    <div class="jurAbsatz">(2) Finanzdienstleistungsinstitute sind Institute, die Finanzdienstleistungen für andere gewerbsmäßig erbringen.</div>
  </div>
</body>
</html>`;

const agg1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Allgemeines Gleichbehandlungsgesetz",
  lawCode: "AGG",
  section: "1",
  heading: "Ziel des Gesetzes",
  text: "Ziel des Gesetzes ist, Benachteiligungen aus Gründen der Rasse oder wegen der ethnischen Herkunft, des Geschlechts, der Religion oder Weltanschauung, einer Behinderung, des Alters oder der sexuellen Identität zu verhindern oder zu beseitigen.",
});

const gwb1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Gesetz gegen Wettbewerbsbeschränkungen",
  lawCode: "GWB",
  section: "1",
  heading: "Verbot wettbewerbsbeschränkender Vereinbarungen",
  text: "Vereinbarungen zwischen Unternehmen, Beschlüsse von Unternehmensvereinigungen und aufeinander abgestimmte Verhaltensweisen, die eine Verhinderung, Einschränkung oder Verfälschung des Wettbewerbs bezwecken oder bewirken, sind verboten.",
});

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

const englishBgbHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>German Civil Code</div>
  <div>BGB</div>
  <div>table of contents</div>
  <div>Section 822</div>
  <div>Unjust enrichment</div>
  <div>A person who obtains something without legal grounds is obliged to return it.</div>
  <div>table of contents</div>
  <div>Section 823</div>
  <div>Liability in damages</div>
  <div>(1) A person who, intentionally or negligently, unlawfully injures the life, body, health, freedom, property or another right of another person is liable to make compensation to the other party for the damage arising from this.</div>
  <div>(2) The same duty is held by a person who commits a breach of a statute that is intended to protect another person.</div>
  <div>table of contents</div>
  <div>Section 824</div>
  <div>Credit endangerment</div>
</body>
</html>`;

const englishBgbTocFirstHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>German Civil Code</div>
  <div>table of contents</div>
  <div>Section 823</div>
  <div>table of contents</div>
  <div>Section 823</div>
  <div>Liability in damages</div>
  <div>(1) A person who, intentionally or negligently, unlawfully injures the life, body, health, freedom, property or another right of another person is liable to make compensation to the other party for the damage arising from this.</div>
  <div>(2) The same duty is held by a person who commits a breach of a statute that is intended to protect another person.</div>
  <div>Section 824</div>
  <div>Credit endangerment</div>
</body>
</html>`;

const englishStgbHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>German Criminal Code</div>
  <div>table of contents</div>
  <div>Section 241</div>
  <div>Threatening the commission of a felony</div>
  <div>Whoever threatens another person with the commission of a felony against them or a person close to them incurs a penalty.</div>
  <div>table of contents</div>
  <div>Section 242</div>
  <div>Theft</div>
  <div>(1) Whoever takes movable property away from another with the intention of unlawfully appropriating the property for themselves or a third party incurs a penalty of imprisonment not exceeding five years or a fine.</div>
  <div>(2) The attempt is punishable.</div>
  <div>table of contents</div>
  <div>Section 243</div>
  <div>Particularly serious case of theft</div>
</body>
</html>`;

const englishOwigHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>Act on Regulatory Offences</div>
  <div>table of contents</div>
  <div>Section 1</div>
  <div>Definition of regulatory offence</div>
  <div>(1) A regulatory offence is an unlawful and reprehensible act which fulfils the constituent elements of a law permitting punishment by a regulatory fine.</div>
  <div>(2) If the law threatens to impose a regulatory fine for intentional and negligent action without distinction as to the maximum regulatory fine, the maximum sanction for a negligent action does not exceed half of the maximum regulatory fine imposable.</div>
  <div>table of contents</div>
  <div>Section 2</div>
  <div>Temporal applicability</div>
</body>
</html>`;

const englishBverfggHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>Act on the Federal Constitutional Court</div>
  <div>(Bundesverfassungsgerichtsgesetz – BVerfGG)</div>
  <div>table of contents</div>
  <div>Section 1</div>
  <div>(1) The Federal Constitutional Court shall be a federal court of justice which is autonomous and independent of all other constitutional organs.</div>
  <div>(2) The seat of the Federal Constitutional Court shall be Karlsruhe.</div>
  <div>(3) The Federal Constitutional Court shall establish its Rules of Procedure, which shall be adopted by the Plenary.</div>
  <div>table of contents</div>
  <div>Section 2</div>
  <div>(1) The Federal Constitutional Court shall consist of two Senates.</div>
</body>
</html>`;

const englishFreizuegGEuHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>Act on the General Freedom of Movement for EU Citizens</div>
  <div>Freedom of Movement Act/EU</div>
  <div>table of contents</div>
  <div>Section 1</div>
  <div>Scope</div>
  <div>This Act regulates entry into and residence in the federal territory by nationals of other member states of the European Union (EU citizens) and their dependants.</div>
  <div>table of contents</div>
  <div>Section 2</div>
  <div>Right of entry and residence</div>
  <div>(1) EU citizens and their dependants entitled to freedom of movement shall have the right to enter and reside in the federal territory pursuant to this Act.</div>
</body>
</html>`;

const englishHgbHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Commercial Code",
  previousSection: "0",
  section: "1",
  heading: "Merchants by virtue of commercial business operations",
  text: "(1) A merchant within the meaning of this Code is a person who operates a commercial business.",
  nextSection: "2",
  nextHeading: "Commercial register",
});

const englishGmbhgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Act on Limited Liability Companies",
  previousSection: "0",
  section: "1",
  heading: "Nature and purpose of the company",
  text: "(1) Limited liability companies may be established for any lawful purpose under this Act by one or more persons.",
  nextSection: "2",
  nextHeading: "Articles of association",
});

const englishAktgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Stock Corporation Act",
  previousSection: "0",
  section: "1",
  heading: "Nature of the stock corporation",
  text: "(1) The stock corporation is a company with its own legal personality.",
  nextSection: "2",
  nextHeading: "Founders",
});

const englishInsoHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Insolvency Code",
  previousSection: "0",
  section: "1",
  heading: "Objectives of insolvency proceedings",
  text: "The insolvency proceedings shall serve to satisfy the creditors of a debtor collectively.",
  nextSection: "2",
  nextHeading: "Jurisdiction",
});

const englishAufenthgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Residence Act",
  previousSection: "0",
  section: "1",
  heading: "Purpose of the Act; scope",
  text: "(1) This Act shall serve to control and limit the influx of foreigners into the Federal Republic of Germany.",
  nextSection: "2",
  nextHeading: "Definitions",
});

const englishFamfgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Act on Proceedings in Family Matters and in Matters of Non-contentious Jurisdiction",
  previousSection: "0",
  section: "1",
  heading: "Scope of application",
  text: "(1) This Act shall apply to proceedings in family matters and matters of non-contentious jurisdiction.",
  nextSection: "2",
  nextHeading: "Local jurisdiction",
});

const englishStagHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Nationality Act",
  previousSection: "0",
  section: "1",
  heading: "Acquisition by birth",
  text: "Nationality is acquired by birth if one parent has German nationality.",
  nextSection: "2",
  nextHeading: "Foundlings",
});

const englishPauswgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Act on Identity Cards and Electronic Identification",
  previousSection: "0",
  section: "1",
  heading: "Identification requirement; law on identification documents",
  text: "(1) Germans within the meaning of Article 116 (1) of the Basic Law are required to possess a valid identity card as soon as they reach the age of 16.",
  nextSection: "2",
  nextHeading: "Definitions",
});

const englishAggHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "General Act on Equal Treatment",
  previousSection: "0",
  section: "1",
  heading: "Purpose",
  text: "The purpose of this Act is to prevent or stop discrimination on the grounds of race or ethnic origin, gender, religion or belief, disability, age or sexual identity.",
  nextSection: "2",
  nextHeading: "Scope",
});

const englishGwbHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Competition Act",
  previousSection: "0",
  section: "1",
  heading: "Prohibition of restraints of competition",
  text: "Agreements between undertakings, decisions by associations of undertakings and concerted practices which have as their object or effect the prevention, restriction or distortion of competition are prohibited.",
  nextSection: "2",
  nextHeading: "Exempted agreements",
});

const englishSgbXivHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Social Code Book XIV – Social Compensation",
  previousSection: "0",
  section: "1",
  heading: "Purpose and ambit of social compensation",
  text: "(1) Social compensation supports people who have suffered damage to their health as a result of an event causing damage for which the state community bears particular responsibility when it comes to dealing with the consequences thereof.",
  nextSection: "2",
  nextHeading: "Persons entitled to social compensation",
});

const englishZpoHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Code of Civil Procedure",
  previousSection: "0",
  section: "1",
  heading: "Substantive jurisdiction",
  text: "The substantive jurisdiction of the courts is determined by the Courts Constitution Act.",
  nextSection: "2",
  nextHeading: "Significance of the value",
});

const englishStpo1HtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "German Code of Criminal Procedure",
  previousSection: "0",
  section: "1",
  heading: "Subject-matter jurisdiction",
  text: "The subject-matter jurisdiction of the courts is determined by the Courts Constitution Act.",
  nextSection: "2",
  nextHeading: "Venue",
});

const englishVwgoHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Code of Administrative Court Procedure",
  previousSection: "0",
  section: "1",
  heading: "Administrative courts",
  text: "Administrative courts shall have jurisdiction in public-law disputes of a non-constitutional nature unless jurisdiction is explicitly assigned to another court.",
  nextSection: "2",
  nextHeading: "Higher administrative courts",
});

const englishBdsgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Federal Data Protection Act",
  previousSection: "0",
  section: "1",
  heading: "Scope of the Act",
  text: "(1) This Act shall apply to the processing of personal data by public bodies of the Federation and the Länder and by private bodies under this Act.",
  nextSection: "2",
  nextHeading: "Definitions",
});

const englishUwgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Act against Unfair Competition",
  previousSection: "0",
  section: "1",
  heading: "Purpose of the Act; scope of application",
  text: "(1) This Act serves to protect competitors, consumers and other market participants against unfair commercial practices.",
  nextSection: "2",
  nextHeading: "Definitions",
});

const englishVvgHtmlFixture = makeEnglishSectionTranslationFixture({
  documentTitle: "Insurance Contract Act 2008",
  previousSection: "0",
  section: "1",
  heading: "Typical contractual duties",
  text: "Under the insurance contract, the insurer undertakes to cover a specific risk of the policyholder or of a third party by a benefit.",
  nextSection: "2",
  nextHeading: "Retroactive insurance",
});

const englishGgHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>Basic Law for the Federal Republic of Germany</div>
  <div>table of contents</div>
  <div>Article 1</div>
  <div>[Human dignity]</div>
  <div>(1) Human dignity shall be inviolable. To respect and protect it shall be the duty of all state authority.</div>
  <div>(2) The German people therefore acknowledge inviolable and inalienable human rights as the basis of every community, of peace and of justice in the world.</div>
  <div>(3) The following basic rights shall bind the legislature, the executive and the judiciary as directly applicable law.</div>
  <div>table of contents</div>
  <div>Article 2</div>
  <div>[Personal freedoms]</div>
</body>
</html>`;

const englishGgTocFirstHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>Basic Law for the Federal Republic of Germany</div>
  <div>table of contents</div>
  <div>Article 1</div>
  <div>table of contents</div>
  <div>Article 1</div>
  <div>[Human dignity]</div>
  <div>(1) Human dignity shall be inviolable. To respect and protect it shall be the duty of all state authority.</div>
  <div>(2) The German people therefore acknowledge inviolable and inalienable human rights as the basis of every community, of peace and of justice in the world.</div>
  <div>Article 2</div>
  <div>[Personal freedoms]</div>
</body>
</html>`;

const englishEgbgbHtmlFixture = `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>INTRODUCTORY ACT TO THE CIVIL CODE</div>
  <div>table of contents</div>
  <div>Art. 1</div>
  <div>(1) The Civil Code enters into force on January 1st, 1900, along with a statute concerning amendments to an Act on the Constitution of the Courts, the Code of Civil Procedure and the Code of Insolvency, a Statute on Compulsory Auction and Sequestration, a Code of Registration of Real Property, and a Statute on the Procedure of Non-Contentious Matters.</div>
  <div>(2) Insofar as, in the Civil Code or in this Act, the regulation is reserved for the Statutes of a Land or insofar as it is ordered, that the provisions of the law of a Land remain unaffected or can be decreed, the existing provisions of the law of the Land will continue to be in force and the Land can decree new statutory provisions.</div>
  <div>table of contents</div>
  <div>Art. 2</div>
  <div>“Statute” under the Civil Code and under this Act means any legal rule.</div>
  <div>table of contents</div>
  <div>Art. 3</div>
  <div>Scope; Relationship with rules of the European Union and with international conventions</div>
  <div>Unless immediately applicable rules of the European Union in their respective pertaining version are relevant, the applicable law is to be determined by the provisions of this chapter.</div>
  <div>table of contents</div>
  <div>Art. 48</div>
  <div>Choice of a name obtained in another Member State of the European Union</div>
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

const owig1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Gesetz über Ordnungswidrigkeiten (OWiG)",
  lawCode: "OWiG",
  section: "1",
  heading: "Begriffsbestimmung",
  text: "(1) Eine Ordnungswidrigkeit ist eine rechtswidrige und vorwerfbare Handlung, die den Tatbestand eines Gesetzes verwirklicht.",
});

const bverfgg1HtmlFixture = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head>
  <title>&#167; 1 BVerfGG - Einzelnorm</title>
</head>
<body>
  <div class="jnheader">
    <h1>Gesetz über das Bundesverfassungsgericht (Bundesverfassungsgerichtsgesetz - BVerfGG)<br />
      <span class="jnenbez">&#167; 1</span>
    </h1>
  </div>
  <div class="jnhtml">
    <div class="jurAbsatz">(1) Das Bundesverfassungsgericht ist ein allen übrigen Verfassungsorganen gegenüber selbständiger und unabhängiger Gerichtshof des Bundes.</div>
    <div class="jurAbsatz">(2) Der Sitz des Bundesverfassungsgerichts ist Karlsruhe.</div>
    <div class="jurAbsatz">(3) Das Bundesverfassungsgericht gibt sich eine Geschäftsordnung, die das Plenum beschließt.</div>
  </div>
</body>
</html>`;

const freizuegGEu1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Gesetz über die allgemeine Freizügigkeit von Unionsbürgern (Freizügigkeitsgesetz/EU - FreizügG/EU)",
  lawCode: "FreizügG/EU",
  section: "1",
  heading: "Anwendungsbereich; Begriffsbestimmungen",
  text: "(1) Dieses Gesetz regelt die Einreise und den Aufenthalt von Unionsbürgern, Staatsangehörigen der EWR-Staaten und ihren Familienangehörigen.",
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

const sgbXIV1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Sozialgesetzbuch Vierzehntes Buch - Soziale Entschädigung",
  lawCode: "SGB XIV",
  section: "1",
  heading: "Zweck und Anwendungsbereich der Sozialen Entschädigung",
  text: "(1) Die Soziale Entschädigung unterstützt Personen, die durch ein schädigendes Ereignis eine gesundheitliche Schädigung erlitten haben, bei dessen Folgenbewältigung.",
});

const bdsg1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Bundesdatenschutzgesetz (BDSG)",
  lawCode: "BDSG",
  section: "1",
  heading: "Anwendungsbereich des Gesetzes",
  text: "(1) Dieses Gesetz gilt für die Verarbeitung personenbezogener Daten durch öffentliche Stellen des Bundes und der Länder sowie nichtöffentliche Stellen nach Maßgabe dieses Gesetzes.",
});

const uwg1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Gesetz gegen den unlauteren Wettbewerb (UWG)",
  lawCode: "UWG",
  section: "1",
  heading: "Zweck des Gesetzes; Anwendungsbereich",
  text: "(1) Dieses Gesetz dient dem Schutz der Mitbewerber, der Verbraucher sowie der sonstigen Marktteilnehmer vor unlauteren geschäftlichen Handlungen.",
});

const vvg1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Gesetz über den Versicherungsvertrag (Versicherungsvertragsgesetz - VVG)",
  lawCode: "VVG",
  section: "1",
  heading: "Vertragstypische Pflichten",
  text: "Der Versicherer verpflichtet sich mit dem Versicherungsvertrag, ein bestimmtes Risiko des Versicherungsnehmers oder eines Dritten durch eine Leistung abzusichern.",
});

const stpo1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Strafprozeßordnung",
  lawCode: "StPO",
  section: "1",
  heading: "Sachliche Zuständigkeit",
  text: "Die sachliche Zuständigkeit der Gerichte wird durch das Gerichtsverfassungsgesetz bestimmt.",
});

const vwgo1HtmlFixture = makeSectionHtmlFixture({
  lawTitle: "Verwaltungsgerichtsordnung",
  lawCode: "VwGO",
  section: "1",
  text: "Die Verwaltungsgerichtsbarkeit wird durch unabhängige, von den Verwaltungsbehörden getrennte Gerichte ausgeübt.",
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
      { lawCode: "AGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/agg/__1.html" },
      { lawCode: "ARBGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/arbgg/__1.html" },
      { lawCode: "ASYLG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/asylvfg_1992/__1.html" },
      { lawCode: "AUFENTHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/aufenthg_2004/__1.html" },
      { lawCode: "BDSG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/bdsg_2018/__1.html" },
      { lawCode: "BGB", section: "823", expectedUrl: "https://www.gesetze-im-internet.de/bgb/__823.html" },
      { lawCode: "BETRVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/betrvg/__1.html" },
      { lawCode: "BVERFGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/bverfgg/__1.html" },
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
      { lawCode: "FREIZÜGG/EU", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/freiz_gg_eu_2004/__1.html" },
      { lawCode: "FGO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/fgo/__1.html" },
      { lawCode: "GEWSTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gewstg/__1.html" },
      { lawCode: "GG", section: "1", referenceType: "article", expectedUrl: "https://www.gesetze-im-internet.de/gg/art_1.html" },
      { lawCode: "GMBHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gmbhg/__1.html" },
      { lawCode: "GWB", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gwb/__1.html" },
      { lawCode: "GVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/gvg/__1.html" },
      { lawCode: "GWG", section: "10", expectedUrl: "https://www.gesetze-im-internet.de/gwg_2017/__10.html" },
      { lawCode: "HGB", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/hgb/__1.html" },
      { lawCode: "INSO", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/inso/__1.html" },
      { lawCode: "JGG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/jgg/__1.html" },
      { lawCode: "KAGB", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kagb/__1.html" },
      { lawCode: "KSCHG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kschg/__1.html" },
      { lawCode: "KSTG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kstg_1977/__1.html" },
      { lawCode: "KWG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/kredwg/__1.html" },
      { lawCode: "OWIG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/owig_1968/__1.html" },
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
      { lawCode: "UWG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/uwg_2004/__1.html" },
      { lawCode: "VVG", section: "1", expectedUrl: "https://www.gesetze-im-internet.de/vvg_2008/__1.html" },
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

  it("builds verified English translation URLs only for explicitly configured laws", () => {
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "AGG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_agg/englisch_agg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "BGB",
        section: "823",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "BVERFGG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "GG",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_gg/englisch_gg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "GWB",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_gwb/englisch_gwb.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "STGB",
        section: "242",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_stgb/englisch_stgb.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "OWIG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_owig/englisch_owig.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "HGB",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_hgb/englisch_hgb.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "GMBHG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_gmbhg/englisch_gmbhg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "AKTG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_aktg/englisch_aktg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "INSO",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_inso/englisch_inso.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "AUFENTHG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_aufenthg/englisch_aufenthg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "BDSG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "EGBGB",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "FAMFG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_famfg/englisch_famfg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "FREIZÜGG/EU",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_freiz_gg_eu/englisch_freiz_gg_eu.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "STAG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_stag/englisch_stag.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "PAUSWG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_pauswg/englisch_pauswg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "SGB XIV",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_sgb_14/englisch_sgb_14.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "STPO",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_stpo/englisch_stpo.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "UWG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "VVG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_vvg/englisch_vvg.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "VWGO",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_vwgo/englisch_vwgo.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "ZPO",
        section: "1",
        sourceVariant: "translation-en",
      }),
      "https://www.gesetze-im-internet.de/englisch_zpo/englisch_zpo.html",
    );
    assert.equal(
      buildGesetzeImInternetSectionUrl({
        lawCode: "KWG",
        section: "1",
        sourceVariant: "translation-en",
      }),
      null,
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

  it("maps BGB § 823 English translation into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BGB", section: "823", sourceVariant: "translation-en" },
      html: englishBgbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "BGB");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, "Liability in damages");
    assert.match(section.text, /^\(1\) A person who, intentionally or negligently/);
    assert.match(section.text, /\(2\) The same duty is held by a person/);
  });

  it("maps GG Art. 1 English translation into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: {
        lawCode: "GG",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      },
      html: englishGgHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_gg/englisch_gg.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "GG");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, "Human dignity");
    assert.match(section.text, /^\(1\) Human dignity shall be inviolable\./);
    assert.match(section.text, /\(3\) The following basic rights shall bind/);
  });

  it("maps EGBGB Art. 1 English translation from the official article HTML into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: {
        lawCode: "EGBGB",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      },
      html: englishEgbgbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "EGBGB");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, undefined);
    assert.match(section.text, /^\(1\) The Civil Code enters into force on January 1st, 1900/);
    assert.match(section.text, /\(2\) Insofar as, in the Civil Code or in this Act/);
    assert.doesNotMatch(section.text, /any legal rule/);
  });

  it("maps titled EGBGB English article translations from the official article HTML", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: {
        lawCode: "EGBGB",
        section: "3",
        referenceType: "article",
        sourceVariant: "translation-en",
      },
      html: englishEgbgbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.heading, "Scope; Relationship with rules of the European Union and with international conventions");
    assert.match(section.text, /^Unless immediately applicable rules of the European Union/);
  });

  it("maps StGB § 242 English translation into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "STGB", section: "242", sourceVariant: "translation-en" },
      html: englishStgbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_stgb/englisch_stgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "StGB");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, "Theft");
    assert.match(section.text, /^\(1\) Whoever takes movable property away from another/);
    assert.match(section.text, /\(2\) The attempt is punishable\./);
  });

  it("maps OWiG § 1 English translation into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "OWIG", section: "1", sourceVariant: "translation-en" },
      html: englishOwigHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_owig/englisch_owig.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "OWiG");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, "Definition of regulatory offence");
    assert.match(section.text, /^\(1\) A regulatory offence is an unlawful and reprehensible act/);
    assert.match(section.text, /\(2\) If the law threatens to impose a regulatory fine/);
  });

  it("maps BVerfGG § 1 English translation without a heading block into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BVERFGG", section: "1", sourceVariant: "translation-en" },
      html: englishBverfggHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "BVerfGG");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, undefined);
    assert.match(section.text, /^\(1\) The Federal Constitutional Court shall be a federal court of justice/);
    assert.match(section.text, /\(3\) The Federal Constitutional Court shall establish its Rules of Procedure/);
  });

  it("maps FreizügG/EU § 1 English translation into LawSection", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "FREIZÜGG/EU", section: "1", sourceVariant: "translation-en" },
      html: englishFreizuegGEuHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_freiz_gg_eu/englisch_freiz_gg_eu.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.lawCode, "FreizügG/EU");
    assert.equal(section.sourceVariant, "translation-en");
    assert.equal(section.heading, "Scope");
    assert.match(section.text, /^This Act regulates entry into and residence in the federal territory/);
  });

  it("maps AGG and GWB English translations into LawSection", () => {
    const aggSection = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "AGG", section: "1", sourceVariant: "translation-en" },
      html: englishAggHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_agg/englisch_agg.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(aggSection.lawCode, "AGG");
    assert.equal(aggSection.sourceVariant, "translation-en");
    assert.equal(aggSection.heading, "Purpose");
    assert.match(aggSection.text, /^The purpose of this Act is to prevent or stop discrimination/);

    const gwbSection = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "GWB", section: "1", sourceVariant: "translation-en" },
      html: englishGwbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_gwb/englisch_gwb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(gwbSection.lawCode, "GWB");
    assert.equal(gwbSection.sourceVariant, "translation-en");
    assert.equal(gwbSection.heading, "Prohibition of restraints of competition");
    assert.match(gwbSection.text, /^Agreements between undertakings, decisions by associations of undertakings/);
  });

  it("skips a TOC match before extracting the real BGB English section", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BGB", section: "823", sourceVariant: "translation-en" },
      html: englishBgbTocFirstHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.heading, "Liability in damages");
    assert.match(section.text, /^\(1\) A person who, intentionally or negligently/);
  });

  it("skips a TOC match before extracting the real GG English article", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: {
        lawCode: "GG",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      },
      html: englishGgTocFirstHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_gg/englisch_gg.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.heading, "Human dignity");
    assert.match(section.text, /^\(1\) Human dignity shall be inviolable\./);
  });

  it("skips the TOC match before extracting the real EGBGB English article", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: {
        lawCode: "EGBGB",
        section: "1",
        referenceType: "article",
        sourceVariant: "translation-en",
      },
      html: englishEgbgbHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.heading, undefined);
    assert.match(section.text, /^\(1\) The Civil Code enters into force on January 1st, 1900/);
    assert.doesNotMatch(section.text, /Choice of a name obtained in another Member State/);
  });

  it("skips the TOC match and keeps heading undefined for BVerfGG English section text", () => {
    const section = mapGesetzeImInternetToLawSection({
      reference: { lawCode: "BVERFGG", section: "1", sourceVariant: "translation-en" },
      html: englishBverfggHtmlFixture,
      sourceUrl: "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
      providerId: "gesetze-im-internet",
      providerLabel: "Gesetze im Internet",
      retrievedAt: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(section.heading, undefined);
    assert.match(section.text, /^\(1\) The Federal Constitutional Court shall be a federal court of justice/);
    assert.doesNotMatch(section.text, /The Federal Constitutional Court shall consist of two Senates/);
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
      { lawCode: "OWIG", expectedDisplayLawCode: "OWiG" },
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

    assert.equal(byCode.get("AGG")?.referenceType, "section");
    assert.deepEqual(byCode.get("AGG")?.exampleInputs, [
      "§ 1 AGG",
      "AGG § 1",
      "1 AGG",
      "AGG 1",
    ]);

    assert.equal(byCode.get("BDSG")?.referenceType, "section");
    assert.deepEqual(byCode.get("BDSG")?.exampleInputs, [
      "§ 1 BDSG",
      "BDSG § 1",
      "1 BDSG",
      "BDSG 1",
    ]);

    assert.equal(byCode.get("FreizügG/EU")?.displayLawCode, "FreizügG/EU");
    assert.equal(byCode.get("FreizügG/EU")?.referenceType, "section");
    assert.deepEqual(byCode.get("FreizügG/EU")?.exampleInputs, [
      "§ 1 FreizügG/EU",
      "FreizügG/EU § 1",
      "1 FreizügG/EU",
      "FreizügG/EU 1",
    ]);

    assert.equal(byCode.get("BVerfGG")?.displayLawCode, "BVerfGG");
    assert.equal(byCode.get("BVerfGG")?.referenceType, "section");
    assert.deepEqual(byCode.get("BVerfGG")?.exampleInputs, [
      "§ 1 BVerfGG",
      "BVerfGG § 1",
      "1 BVerfGG",
      "BVerfGG 1",
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

    assert.equal(byCode.get("GWB")?.referenceType, "section");
    assert.deepEqual(byCode.get("GWB")?.exampleInputs, [
      "§ 1 GWB",
      "GWB § 1",
      "1 GWB",
      "GWB 1",
    ]);

    assert.equal(byCode.get("EGBGB")?.referenceType, "article");
    assert.deepEqual(byCode.get("EGBGB")?.exampleInputs, [
      "Art. 1 EGBGB",
      "EGBGB Art. 1",
      "Art. 229 § 6 EGBGB",
      "EGBGB Artikel 246a § 1",
    ]);

    assert.equal(byCode.get("OWiG")?.referenceType, "section");
    assert.deepEqual(byCode.get("OWiG")?.exampleInputs, [
      "§ 1 OWiG",
      "OWiG § 1",
      "1 OWiG",
      "OWiG 1",
    ]);

    assert.equal(byCode.get("KWG")?.referenceType, "section");
    assert.deepEqual(byCode.get("KWG")?.exampleInputs, [
      "§ 1 KWG",
      "KWG § 1",
      "1 KWG",
      "KWG 1",
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

    assert.equal(byCode.get("UWG")?.referenceType, "section");
    assert.deepEqual(byCode.get("UWG")?.exampleInputs, [
      "§ 1 UWG",
      "UWG § 1",
      "1 UWG",
      "UWG 1",
    ]);

    assert.equal(byCode.get("VVG")?.referenceType, "section");
    assert.deepEqual(byCode.get("VVG")?.exampleInputs, [
      "§ 1 VVG",
      "VVG § 1",
      "1 VVG",
      "VVG 1",
    ]);

    assert.equal(byCode.get("VwGO")?.referenceType, "section");
    assert.deepEqual(byCode.get("VwGO")?.exampleInputs, [
      "§ 1 VwGO",
      "VwGO § 1",
      "1 VwGO",
      "VwGO 1",
    ]);

    assert.equal(byCode.get("StPO")?.referenceType, "section");
    assert.deepEqual(byCode.get("StPO")?.exampleInputs, [
      "§ 1 StPO",
      "StPO § 1",
      "1 StPO",
      "StPO 1",
    ]);

    assert.equal(byCode.get("ZPO")?.referenceType, "section");
    assert.deepEqual(byCode.get("ZPO")?.exampleInputs, [
      "§ 1 ZPO",
      "ZPO § 1",
      "1 ZPO",
      "ZPO 1",
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

  it("resolves BVerfGG § 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(bverfgg1HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "BVERFGG", section: "1" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "BVerfGG");
    assert.equal(section?.lawTitle, "Gesetz über das Bundesverfassungsgericht");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/bverfgg/__1.html");
    assert.equal(section?.heading, undefined);
    assert.match(section?.text ?? "", /^\(1\) Das Bundesverfassungsgericht ist ein allen übrigen Verfassungsorganen/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/bverfgg/__1.html"]);
  });

  it("resolves FreizügG/EU § 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(freizuegGEu1HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "FREIZÜGG/EU", section: "1" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "FreizügG/EU");
    assert.equal(section?.lawTitle, "Gesetz über die allgemeine Freizügigkeit von Unionsbürgern");
    assert.equal(section?.heading, "Anwendungsbereich; Begriffsbestimmungen");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/freiz_gg_eu_2004/__1.html");
    assert.match(section?.text ?? "", /^\(1\) Dieses Gesetz regelt die Einreise und den Aufenthalt/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/freiz_gg_eu_2004/__1.html"]);
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

  it("resolves SGB XIV § 1 from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(sgbXIV1HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "SGB XIV", section: "1" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "SGB XIV");
    assert.equal(section?.lawTitle, "Sozialgesetzbuch Vierzehntes Buch - Soziale Entschädigung");
    assert.equal(section?.heading, "Zweck und Anwendungsbereich der Sozialen Entschädigung");
    assert.equal(section?.sourceUrl, "https://www.gesetze-im-internet.de/sgb_14/__1.html");
    assert.match(section?.text ?? "", /^\(1\) Die Soziale Entschädigung unterstützt Personen/);
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/sgb_14/__1.html"]);
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

  it("resolves BGB § 823 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishBgbHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "BGB",
      section: "823",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, "Liability in damages");
    assert.match(section?.text ?? "", /^\(1\) A person who, intentionally or negligently/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html",
    ]);
  });

  it("resolves GG Art. 1 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishGgHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "GG",
      section: "1",
      referenceType: "article",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, "Human dignity");
    assert.match(section?.text ?? "", /^\(1\) Human dignity shall be inviolable\./);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_gg/englisch_gg.html",
    ]);
  });

  it("resolves EGBGB Art. 1 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishEgbgbHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "EGBGB");
    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, undefined);
    assert.match(section?.text ?? "", /^\(1\) The Civil Code enters into force on January 1st, 1900/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
    ]);
  });

  it("resolves StGB § 242 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishStgbHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "STGB",
      section: "242",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "StGB");
    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, "Theft");
    assert.match(section?.text ?? "", /^\(1\) Whoever takes movable property away from another/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_stgb/englisch_stgb.html",
    ]);
  });

  it("resolves OWiG § 1 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishOwigHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "OWIG",
      section: "1",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "OWiG");
    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, "Definition of regulatory offence");
    assert.match(section?.text ?? "", /^\(1\) A regulatory offence is an unlawful and reprehensible act/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_owig/englisch_owig.html",
    ]);
  });

  it("resolves BVerfGG § 1 English translation without a heading block from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishBverfggHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "BVERFGG",
      section: "1",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "BVerfGG");
    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, undefined);
    assert.match(section?.text ?? "", /^\(1\) The Federal Constitutional Court shall be a federal court of justice/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
    ]);
  });

  it("resolves FreizügG/EU § 1 English translation from fixture-backed fetch", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(englishFreizuegGEuHtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "FREIZÜGG/EU",
      section: "1",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "FreizügG/EU");
    assert.equal(section?.sourceVariant, "translation-en");
    assert.equal(section?.heading, "Scope");
    assert.match(section?.text ?? "", /^This Act regulates entry into and residence in the federal territory/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_freiz_gg_eu/englisch_freiz_gg_eu.html",
    ]);
  });

  it("resolves additional verified English section translations from fixture-backed fetches", async () => {
    const cases: Array<{
      lawCode: string;
      section: string;
      referenceType?: LawReference["referenceType"];
      fixture: string;
      expectedLawCode: string;
      expectedHeading?: string;
      expectedTextStart: RegExp;
      expectedUrl: string;
    }> = [
      {
        lawCode: "EGBGB",
        section: "1",
        referenceType: "article" as const,
        fixture: englishEgbgbHtmlFixture,
        expectedLawCode: "EGBGB",
        expectedHeading: undefined,
        expectedTextStart: /^\(1\) The Civil Code enters into force on January 1st, 1900/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
      },
      {
        lawCode: "FREIZÜGG/EU",
        section: "1",
        fixture: englishFreizuegGEuHtmlFixture,
        expectedLawCode: "FreizügG/EU",
        expectedHeading: "Scope",
        expectedTextStart: /^This Act regulates entry into and residence in the federal territory/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_freiz_gg_eu/englisch_freiz_gg_eu.html",
      },
      {
        lawCode: "BVERFGG",
        section: "1",
        fixture: englishBverfggHtmlFixture,
        expectedLawCode: "BVerfGG",
        expectedHeading: undefined,
        expectedTextStart: /^\(1\) The Federal Constitutional Court shall be a federal court of justice/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
      },
      {
        lawCode: "HGB",
        section: "1",
        fixture: englishHgbHtmlFixture,
        expectedLawCode: "HGB",
        expectedHeading: "Merchants by virtue of commercial business operations",
        expectedTextStart: /^\(1\) A merchant within the meaning of this Code/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_hgb/englisch_hgb.html",
      },
      {
        lawCode: "GMBHG",
        section: "1",
        fixture: englishGmbhgHtmlFixture,
        expectedLawCode: "GmbHG",
        expectedHeading: "Nature and purpose of the company",
        expectedTextStart: /^\(1\) Limited liability companies may be established/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_gmbhg/englisch_gmbhg.html",
      },
      {
        lawCode: "AKTG",
        section: "1",
        fixture: englishAktgHtmlFixture,
        expectedLawCode: "AktG",
        expectedHeading: "Nature of the stock corporation",
        expectedTextStart: /^\(1\) The stock corporation is a company with its own legal personality\./,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_aktg/englisch_aktg.html",
      },
      {
        lawCode: "INSO",
        section: "1",
        fixture: englishInsoHtmlFixture,
        expectedLawCode: "InsO",
        expectedHeading: "Objectives of insolvency proceedings",
        expectedTextStart: /^The insolvency proceedings shall serve to satisfy the creditors/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_inso/englisch_inso.html",
      },
      {
        lawCode: "AUFENTHG",
        section: "1",
        fixture: englishAufenthgHtmlFixture,
        expectedLawCode: "AufenthG",
        expectedHeading: "Purpose of the Act; scope",
        expectedTextStart: /^\(1\) This Act shall serve to control and limit the influx of foreigners/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_aufenthg/englisch_aufenthg.html",
      },
      {
        lawCode: "FAMFG",
        section: "1",
        fixture: englishFamfgHtmlFixture,
        expectedLawCode: "FamFG",
        expectedHeading: "Scope of application",
        expectedTextStart: /^\(1\) This Act shall apply to proceedings in family matters/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_famfg/englisch_famfg.html",
      },
      {
        lawCode: "STAG",
        section: "1",
        fixture: englishStagHtmlFixture,
        expectedLawCode: "StAG",
        expectedHeading: "Acquisition by birth",
        expectedTextStart: /^Nationality is acquired by birth if one parent has German nationality\./,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_stag/englisch_stag.html",
      },
      {
        lawCode: "PAUSWG",
        section: "1",
        fixture: englishPauswgHtmlFixture,
        expectedLawCode: "PAuswG",
        expectedHeading: "Identification requirement; law on identification documents",
        expectedTextStart: /^\(1\) Germans within the meaning of Article 116 \(1\) of the Basic Law/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_pauswg/englisch_pauswg.html",
      },
      {
        lawCode: "SGB XIV",
        section: "1",
        fixture: englishSgbXivHtmlFixture,
        expectedLawCode: "SGB XIV",
        expectedHeading: "Purpose and ambit of social compensation",
        expectedTextStart: /^\(1\) Social compensation supports people who have suffered damage to their health/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_sgb_14/englisch_sgb_14.html",
      },
      {
        lawCode: "ZPO",
        section: "1",
        fixture: englishZpoHtmlFixture,
        expectedLawCode: "ZPO",
        expectedHeading: "Substantive jurisdiction",
        expectedTextStart: /^The substantive jurisdiction of the courts is determined by the Courts Constitution Act\./,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_zpo/englisch_zpo.html",
      },
      {
        lawCode: "STPO",
        section: "1",
        fixture: englishStpo1HtmlFixture,
        expectedLawCode: "StPO",
        expectedHeading: "Subject-matter jurisdiction",
        expectedTextStart: /^The subject-matter jurisdiction of the courts is determined by the Courts Constitution Act\./,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_stpo/englisch_stpo.html",
      },
      {
        lawCode: "VWGO",
        section: "1",
        fixture: englishVwgoHtmlFixture,
        expectedLawCode: "VwGO",
        expectedHeading: "Administrative courts",
        expectedTextStart: /^Administrative courts shall have jurisdiction in public-law disputes/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_vwgo/englisch_vwgo.html",
      },
      {
        lawCode: "BDSG",
        section: "1",
        fixture: englishBdsgHtmlFixture,
        expectedLawCode: "BDSG",
        expectedHeading: "Scope of the Act",
        expectedTextStart: /^\(1\) This Act shall apply to the processing of personal data/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html",
      },
      {
        lawCode: "UWG",
        section: "1",
        fixture: englishUwgHtmlFixture,
        expectedLawCode: "UWG",
        expectedHeading: "Purpose of the Act; scope of application",
        expectedTextStart: /^\(1\) This Act serves to protect competitors, consumers and other market participants/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html",
      },
      {
        lawCode: "VVG",
        section: "1",
        fixture: englishVvgHtmlFixture,
        expectedLawCode: "VVG",
        expectedHeading: "Typical contractual duties",
        expectedTextStart: /^Under the insurance contract, the insurer undertakes to cover a specific risk/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_vvg/englisch_vvg.html",
      },
      {
        lawCode: "AGG",
        section: "1",
        fixture: englishAggHtmlFixture,
        expectedLawCode: "AGG",
        expectedHeading: "Purpose",
        expectedTextStart: /^The purpose of this Act is to prevent or stop discrimination/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_agg/englisch_agg.html",
      },
      {
        lawCode: "GWB",
        section: "1",
        fixture: englishGwbHtmlFixture,
        expectedLawCode: "GWB",
        expectedHeading: "Prohibition of restraints of competition",
        expectedTextStart: /^Agreements between undertakings, decisions by associations of undertakings/,
        expectedUrl: "https://www.gesetze-im-internet.de/englisch_gwb/englisch_gwb.html",
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
        referenceType: testCase.referenceType,
        sourceVariant: "translation-en",
      });

      assert.equal(section?.lawCode, testCase.expectedLawCode);
      assert.equal(section?.sourceVariant, "translation-en");
      assert.equal(section?.heading, testCase.expectedHeading);
      assert.match(section?.text ?? "", testCase.expectedTextStart);
      assert.deepEqual(requestedUrls, [testCase.expectedUrl]);
    }
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
        lawCode: "BDSG",
        section: "1",
        fixture: bdsg1HtmlFixture,
        expectedLawCode: "BDSG",
        expectedLawTitle: "Bundesdatenschutzgesetz",
        expectedHeading: "Anwendungsbereich des Gesetzes",
        expectedUrl: "https://www.gesetze-im-internet.de/bdsg_2018/__1.html",
      },
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
        lawCode: "AGG",
        section: "1",
        fixture: agg1HtmlFixture,
        expectedLawCode: "AGG",
        expectedLawTitle: "Allgemeines Gleichbehandlungsgesetz",
        expectedHeading: "Ziel des Gesetzes",
        expectedUrl: "https://www.gesetze-im-internet.de/agg/__1.html",
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
        lawCode: "STPO",
        section: "1",
        fixture: stpo1HtmlFixture,
        expectedLawCode: "StPO",
        expectedLawTitle: "Strafprozeßordnung",
        expectedHeading: "Sachliche Zuständigkeit",
        expectedUrl: "https://www.gesetze-im-internet.de/stpo/__1.html",
      },
      {
        lawCode: "VWGO",
        section: "1",
        fixture: vwgo1HtmlFixture,
        expectedLawCode: "VwGO",
        expectedLawTitle: "Verwaltungsgerichtsordnung",
        expectedHeading: "",
        expectedUrl: "https://www.gesetze-im-internet.de/vwgo/__1.html",
      },
      {
        lawCode: "UWG",
        section: "1",
        fixture: uwg1HtmlFixture,
        expectedLawCode: "UWG",
        expectedLawTitle: "Gesetz gegen den unlauteren Wettbewerb",
        expectedHeading: "Zweck des Gesetzes; Anwendungsbereich",
        expectedUrl: "https://www.gesetze-im-internet.de/uwg_2004/__1.html",
      },
      {
        lawCode: "VVG",
        section: "1",
        fixture: vvg1HtmlFixture,
        expectedLawCode: "VVG",
        expectedLawTitle: "Gesetz über den Versicherungsvertrag",
        expectedHeading: "Vertragstypische Pflichten",
        expectedUrl: "https://www.gesetze-im-internet.de/vvg_2008/__1.html",
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
        lawCode: "GWB",
        section: "1",
        fixture: gwb1HtmlFixture,
        expectedLawCode: "GWB",
        expectedLawTitle: "Gesetz gegen Wettbewerbsbeschränkungen",
        expectedHeading: "Verbot wettbewerbsbeschränkender Vereinbarungen",
        expectedUrl: "https://www.gesetze-im-internet.de/gwb/__1.html",
      },
      {
        lawCode: "KWG",
        section: "1",
        fixture: kwg1HtmlFixture,
        expectedLawCode: "KWG",
        expectedLawTitle: "Gesetz über das Kreditwesen",
        expectedHeading: "Begriffsbestimmungen; Verordnungsermächtigung",
        expectedUrl: "https://www.gesetze-im-internet.de/kredwg/__1.html",
      },
      {
        lawCode: "OWIG",
        section: "1",
        fixture: owig1HtmlFixture,
        expectedLawCode: "OWiG",
        expectedLawTitle: "Gesetz über Ordnungswidrigkeiten",
        expectedHeading: "Begriffsbestimmung",
        expectedUrl: "https://www.gesetze-im-internet.de/owig_1968/__1.html",
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

  it("falls back to official German text for KWG because no English translation is configured", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(kwg1HtmlFixture);
    });

    const section = await provider.getSection({
      lawCode: "KWG",
      section: "1",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.lawCode, "KWG");
    assert.equal(section?.sourceVariant, "official-de");
    assert.match(section?.text ?? "", /^\(1\) Kreditinstitute sind Unternehmen/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/kredwg/__1.html",
    ]);
  });

  it("falls back to official German text when the configured StGB English citation is missing", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);

      if (url.endsWith("/englisch_stgb/englisch_stgb.html")) {
        return textResponse(englishStgbHtmlFixture);
      }

      if (url.endsWith("/stgb/__999.html")) {
        return textResponse(makeSectionHtmlFixture({
          lawTitle: "Strafgesetzbuch",
          lawCode: "StGB",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }));
      }

      return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    });

    const section = await provider.getSection({
      lawCode: "STGB",
      section: "999",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.sourceVariant, "official-de");
    assert.equal(section?.heading, "Deutsche Ersatznorm");
    assert.match(section?.text ?? "", /^Deutscher amtlicher Ersatztext\.$/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_stgb/englisch_stgb.html",
      "https://www.gesetze-im-internet.de/stgb/__999.html",
    ]);
  });

  it("falls back to official German text when the configured OWiG English citation is missing", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);

      if (url.endsWith("/englisch_owig/englisch_owig.html")) {
        return textResponse(englishOwigHtmlFixture);
      }

      if (url.endsWith("/owig_1968/__999.html")) {
        return textResponse(makeSectionHtmlFixture({
          lawTitle: "Gesetz über Ordnungswidrigkeiten",
          lawCode: "OWiG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }));
      }

      return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    });

    const section = await provider.getSection({
      lawCode: "OWIG",
      section: "999",
      sourceVariant: "translation-en",
    });

    assert.equal(section?.sourceVariant, "official-de");
    assert.equal(section?.heading, "Deutsche Ersatznorm");
    assert.match(section?.text ?? "", /^Deutscher amtlicher Ersatztext\.$/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_owig/englisch_owig.html",
      "https://www.gesetze-im-internet.de/owig_1968/__999.html",
    ]);
  });

  it("falls back to official German text for additional configured English section sources when the citation is missing", async () => {
    const cases: Array<{
      lawCode: string;
      referenceType?: LawReference["referenceType"];
      subsection?: string;
      translationUrl: string;
      translationFixture: string;
      officialUrl: string;
      officialFixture: string;
    }> = [
      {
        lawCode: "FREIZÜGG/EU",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_freiz_gg_eu/englisch_freiz_gg_eu.html",
        translationFixture: englishFreizuegGEuHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/freiz_gg_eu_2004/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz über die allgemeine Freizügigkeit von Unionsbürgern",
          lawCode: "FreizügG/EU",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "EGBGB",
        referenceType: "article" as const,
        subsection: "6",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_egbgb/englisch_egbgb.html",
        translationFixture: englishEgbgbHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/bgbeg/art_229__6.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Einführungsgesetz zum Bürgerlichen Gesetzbuche",
          lawCode: "EGBGB",
          section: "229",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "BVERFGG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_bverfgg/englisch_bverfgg.html",
        translationFixture: englishBverfggHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/bverfgg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz über das Bundesverfassungsgericht",
          lawCode: "BVerfGG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "HGB",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_hgb/englisch_hgb.html",
        translationFixture: englishHgbHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/hgb/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Handelsgesetzbuch",
          lawCode: "HGB",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "GMBHG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_gmbhg/englisch_gmbhg.html",
        translationFixture: englishGmbhgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/gmbhg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz betreffend die Gesellschaften mit beschränkter Haftung",
          lawCode: "GmbHG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "AKTG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_aktg/englisch_aktg.html",
        translationFixture: englishAktgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/aktg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Aktiengesetz",
          lawCode: "AktG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "INSO",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_inso/englisch_inso.html",
        translationFixture: englishInsoHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/inso/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Insolvenzordnung",
          lawCode: "InsO",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "AUFENTHG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_aufenthg/englisch_aufenthg.html",
        translationFixture: englishAufenthgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/aufenthg_2004/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Aufenthaltsgesetz",
          lawCode: "AufenthG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "FAMFG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_famfg/englisch_famfg.html",
        translationFixture: englishFamfgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/famfg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz über das Verfahren in Familiensachen und in den Angelegenheiten der freiwilligen Gerichtsbarkeit",
          lawCode: "FamFG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "STAG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_stag/englisch_stag.html",
        translationFixture: englishStagHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/stag/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Staatsangehörigkeitsgesetz",
          lawCode: "StAG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "PAUSWG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_pauswg/englisch_pauswg.html",
        translationFixture: englishPauswgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/pauswg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Personalausweisgesetz",
          lawCode: "PAuswG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "SGB XIV",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_sgb_14/englisch_sgb_14.html",
        translationFixture: englishSgbXivHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/sgb_14/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Sozialgesetzbuch Vierzehntes Buch - Soziale Entschädigung",
          lawCode: "SGB XIV",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "ZPO",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_zpo/englisch_zpo.html",
        translationFixture: englishZpoHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/zpo/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Zivilprozessordnung",
          lawCode: "ZPO",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "STPO",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_stpo/englisch_stpo.html",
        translationFixture: englishStpo1HtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/stpo/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Strafprozeßordnung",
          lawCode: "StPO",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "VWGO",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_vwgo/englisch_vwgo.html",
        translationFixture: englishVwgoHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/vwgo/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Verwaltungsgerichtsordnung",
          lawCode: "VwGO",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "BDSG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html",
        translationFixture: englishBdsgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/bdsg_2018/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Bundesdatenschutzgesetz",
          lawCode: "BDSG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "UWG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_uwg/englisch_uwg.html",
        translationFixture: englishUwgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/uwg_2004/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz gegen den unlauteren Wettbewerb",
          lawCode: "UWG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "VVG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_vvg/englisch_vvg.html",
        translationFixture: englishVvgHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/vvg_2008/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz über den Versicherungsvertrag",
          lawCode: "VVG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "AGG",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_agg/englisch_agg.html",
        translationFixture: englishAggHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/agg/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Allgemeines Gleichbehandlungsgesetz",
          lawCode: "AGG",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
      {
        lawCode: "GWB",
        translationUrl: "https://www.gesetze-im-internet.de/englisch_gwb/englisch_gwb.html",
        translationFixture: englishGwbHtmlFixture,
        officialUrl: "https://www.gesetze-im-internet.de/gwb/__999.html",
        officialFixture: makeSectionHtmlFixture({
          lawTitle: "Gesetz gegen Wettbewerbsbeschränkungen",
          lawCode: "GWB",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }),
      },
    ];

    for (const testCase of cases) {
      const requestedUrls: string[] = [];
      const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
        requestedUrls.push(url);

        if (url === testCase.translationUrl) {
          return textResponse(testCase.translationFixture);
        }

        if (url === testCase.officialUrl) {
          return textResponse(testCase.officialFixture);
        }

        return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
      });

      const section = await provider.getSection({
        lawCode: testCase.lawCode,
        section: testCase.lawCode === "EGBGB" ? "229" : "999",
        subsection: testCase.subsection,
        referenceType: testCase.referenceType,
        sourceVariant: "translation-en",
      });

      assert.equal(section?.sourceVariant, "official-de");
      assert.equal(section?.heading, "Deutsche Ersatznorm");
      assert.match(section?.text ?? "", /^Deutscher amtlicher Ersatztext\.$/);
      assert.deepEqual(requestedUrls, [
        testCase.translationUrl,
        testCase.officialUrl,
      ]);
    }
  });

  it("falls back to official German text when the configured English citation is missing", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);

      if (url.endsWith("/englisch_bgb/englisch_bgb.html")) {
        return textResponse(englishBgbHtmlFixture);
      }

      if (url.endsWith("/bgb/__999.html")) {
        return textResponse(makeSectionHtmlFixture({
          lawTitle: "Bürgerliches Gesetzbuch",
          lawCode: "BGB",
          section: "999",
          heading: "Deutsche Ersatznorm",
          text: "Deutscher amtlicher Ersatztext.",
        }));
      }

      return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    });

    const section = await provider.getSection({
        lawCode: "BGB",
        section: "999",
        sourceVariant: "translation-en",
      });

    assert.equal(section?.sourceVariant, "official-de");
    assert.equal(section?.heading, "Deutsche Ersatznorm");
    assert.match(section?.text ?? "", /^Deutscher amtlicher Ersatztext\.$/);
    assert.deepEqual(requestedUrls, [
      "https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html",
      "https://www.gesetze-im-internet.de/bgb/__999.html",
    ]);
  });
});

describe("Gesetze im Internet Austrian jurisdiction gate", () => {
  it("returns null for explicit AT StGB without fetching", async () => {
    let calls = 0;
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      calls += 1;
      return textResponse(stgb242HtmlFixture);
    });

    assert.equal(
      await provider.getSection({ lawCode: "STGB", section: "75", jurisdiction: "AT" }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("returns null for explicit CH StGB without fetching", async () => {
    let calls = 0;
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      calls += 1;
      return textResponse(stgb242HtmlFixture);
    });

    assert.equal(
      await provider.getSection({ lawCode: "STGB", section: "75", jurisdiction: "CH" }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("returns null for explicit EU StGB without fetching", async () => {
    let calls = 0;
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      calls += 1;
      return textResponse(stgb242HtmlFixture);
    });

    assert.equal(
      await provider.getSection({ lawCode: "STGB", section: "75", jurisdiction: "EU" }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("does not let Gesetze im Internet claim explicit AT StGB before RIS", async () => {
    let gesetzeCalls = 0;
    const gesetze = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async () => {
      gesetzeCalls += 1;
      return textResponse(stgb242HtmlFixture);
    });
    const risAtStgbHtml = `<!DOCTYPE html><html lang="de"><head><title>RIS - StGB § 75</title></head><body><div id="tabContent"><h1>Strafgesetzbuch<br/>§ 75 Mord</h1><p>Wer einen anderen tötet, ist mit Freiheitsstrafe zu bestrafen.</p></div>Gesetzesnummer: 10002296<br/>Dokumentnummer: NOR12123456<br/>Zuletzt aktualisiert am: 01.01.2026</body></html>`;
    const ris = new RisLawProvider("https://www.ris.bka.gv.at", async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => risAtStgbHtml,
    }));

    const registry = new ProviderRegistry([gesetze, ris]);

    const result = await registry.getSection({ lawCode: "STGB", section: "75", jurisdiction: "AT" });

    assert.equal(result?.providerId, "ris");
    assert.equal(result?.jurisdiction, "AT");
    assert.equal(gesetzeCalls, 0);
  });

  it("keeps bare STGB DE-compatible", async () => {
    const requestedUrls: string[] = [];
    const provider = new GesetzeImInternetProvider("https://www.gesetze-im-internet.de", async (url) => {
      requestedUrls.push(url);
      return textResponse(stgb242HtmlFixture);
    });

    const section = await provider.getSection({ lawCode: "STGB", section: "242" });

    assert.equal(section?.providerId, "gesetze-im-internet");
    assert.equal(section?.lawCode, "StGB");
    assert.deepEqual(requestedUrls, ["https://www.gesetze-im-internet.de/stgb/__242.html"]);
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

  it("allows translation requests to skip a NeuRIS-like null and resolve through Gesetze im Internet", async () => {
    const calls: string[] = [];
    const registry = new ProviderRegistry([
      provider("neuris", null, calls),
      provider("gesetze-im-internet", section("gesetze-im-internet", {
        sourceVariant: "translation-en",
        heading: "Liability in damages",
        text: "English law text.",
      }), calls),
    ]);

    const result = await registry.getSection({
      lawCode: "BGB",
      section: "823",
      sourceVariant: "translation-en",
    });

    assert.equal(result.providerId, "gesetze-im-internet");
    assert.equal(result.sourceVariant, "translation-en");
    assert.deepEqual(calls, ["neuris", "gesetze-im-internet"]);
  });
});

function section(providerId: string, overrides: Partial<LawSection> = {}): LawSection {
  return {
    providerId,
    providerLabel: providerId,
    lawCode: "BGB",
    lawTitle: "Bürgerliches Gesetzbuch",
    section: "823",
    sourceVariant: "official-de",
    text: "Fixture text",
    retrievedAt: "2026-05-19T00:00:00.000Z",
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
    ...overrides,
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

function makeEnglishSectionTranslationFixture(params: {
  documentTitle: string;
  previousSection: string;
  section: string;
  heading: string;
  text: string;
  nextSection: string;
  nextHeading: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<body>
  <div>${params.documentTitle}</div>
  <div>table of contents</div>
  <div>Section ${params.previousSection}</div>
  <div>table of contents</div>
  <div>Section ${params.section}</div>
  <div>${params.heading}</div>
  <div>${params.text}</div>
  <div>table of contents</div>
  <div>Section ${params.nextSection}</div>
  <div>${params.nextHeading}</div>
</body>
</html>`;
}
