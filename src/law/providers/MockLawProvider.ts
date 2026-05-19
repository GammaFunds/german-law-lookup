import type { LawProvider } from "../LawProvider";
import type { LawReference, LawSection } from "../types";

const MOCK_RETRIEVED_AT = "2026-05-19T00:00:00.000Z";

const sections: Record<string, Omit<LawSection, "providerId" | "providerLabel">> = {
  "BGB:823": {
    lawCode: "BGB",
    lawTitle: "Bürgerliches Gesetzbuch",
    section: "823",
    heading: "Schadensersatzpflicht",
    text: "Wer vorsätzlich oder fahrlässig das Leben, den Körper, die Gesundheit, die Freiheit, das Eigentum oder ein sonstiges Recht eines anderen widerrechtlich verletzt, ist dem anderen zum Ersatz des daraus entstehenden Schadens verpflichtet.",
    retrievedAt: MOCK_RETRIEVED_AT,
    cacheStatus: "cached",
    isOfficialSource: false,
    isAuthoritativeText: false,
  },
  "KAGB:1": {
    lawCode: "KAGB",
    lawTitle: "Kapitalanlagegesetzbuch",
    section: "1",
    heading: "Begriffsbestimmungen",
    text: "Dieses Gesetz enthält Begriffsbestimmungen für Investmentvermögen, Verwaltungsgesellschaften und weitere zentrale Begriffe des Kapitalanlagegesetzbuchs.",
    retrievedAt: MOCK_RETRIEVED_AT,
    cacheStatus: "cached",
    isOfficialSource: false,
    isAuthoritativeText: false,
  },
  "GWG:10": {
    lawCode: "GwG",
    lawTitle: "Geldwäschegesetz",
    section: "10",
    heading: "Allgemeine Sorgfaltspflichten",
    text: "Verpflichtete haben allgemeine Sorgfaltspflichten zu erfüllen, insbesondere Vertragspartner zu identifizieren und Geschäftsbeziehungen angemessen zu überwachen.",
    retrievedAt: MOCK_RETRIEVED_AT,
    cacheStatus: "cached",
    isOfficialSource: false,
    isAuthoritativeText: false,
  },
};

export class MockLawProvider implements LawProvider {
  readonly id = "mock";
  readonly label = "Mock Law Provider";

  async getSection(reference: LawReference): Promise<LawSection | null> {
    const key = `${reference.lawCode.toUpperCase()}:${reference.section}`;
    const section = sections[key];

    if (!section) {
      return null;
    }

    return {
      providerId: this.id,
      providerLabel: this.label,
      ...section,
    };
  }
}

