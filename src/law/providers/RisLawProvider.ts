import type { LawProvider } from "../LawProvider";
import { LawProviderUnavailableError } from "../errors";
import type {
  LawProviderHttpResponse,
  LawProviderHttpTransport,
} from "../httpTransport";
import type { LawReference, LawSection } from "../types";
import {
  buildRisSectionUrl,
  canMapRisReference,
  extractRisErvArticleEnglish,
  mapRisErvToLawSection,
  mapRisToLawSection,
} from "./risMapping";

const BASE_URL = "https://www.ris.bka.gv.at";

export class RisLawProvider implements LawProvider {
  readonly id = "ris";
  readonly label = "RIS / Rechtsinformationssystem des Bundes";

  constructor(
    private readonly baseUrl = BASE_URL,
    private readonly fetchFn: LawProviderHttpTransport,
  ) {}

  async getSection(reference: LawReference): Promise<LawSection | null> {
    if (reference.jurisdiction !== "AT") {
      return null;
    }

    if (reference.sourceVariant === "translation-en") {
      return this.getTranslationEnSection(reference);
    }

    const sectionUrl = buildRisSectionUrl(reference);
    if (!sectionUrl) {
      return null;
    }

    try {
      const response = await this.request(sectionUrl);
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new LawProviderUnavailableError(
          this.id,
          `RIS request failed: ${sectionUrl}`,
        );
      }

      const html = await this.getText(response, sectionUrl);
      if (!canMapRisReference(reference, html)) {
        return null;
      }

      return mapRisToLawSection({
        reference,
        html,
        sourceUrl: sectionUrl,
        providerId: this.id,
        providerLabel: this.label,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof LawProviderUnavailableError) {
        throw error;
      }

      throw new LawProviderUnavailableError(
        this.id,
        "RIS lookup failed before a definitive not-found result.",
        error,
      );
    }
  }

  private async getTranslationEnSection(reference: LawReference): Promise<LawSection | null> {
    const sectionUrl = buildRisSectionUrl(reference);
    if (!sectionUrl) {
      return null;
    }

    try {
      const response = await this.request(sectionUrl);
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new LawProviderUnavailableError(
          this.id,
          `RIS request failed: ${sectionUrl}`,
        );
      }

      const html = await this.getText(response, sectionUrl);
      if (!extractRisErvArticleEnglish(html, reference.section)) {
        return null;
      }

      return mapRisErvToLawSection({
        reference,
        html,
        sourceUrl: sectionUrl,
        providerId: this.id,
        providerLabel: this.label,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof LawProviderUnavailableError) {
        throw error;
      }

      throw new LawProviderUnavailableError(
        this.id,
        "RIS translation-en lookup failed before a definitive not-found result.",
        error,
      );
    }
  }

  private async request(url: string): ReturnType<LawProviderHttpTransport> {
    try {
      return await this.fetchFn(url);
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `RIS request failed: ${url}`,
        error,
      );
    }
  }

  private async getText(response: LawProviderHttpResponse, url: string): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `RIS text parsing failed: ${url}`,
        error,
      );
    }
  }
}