import type { LawProvider } from "../LawProvider";
import { LawProviderUnavailableError } from "../errors";
import {
  createFetchLawProviderTransport,
  type LawProviderHttpTransport,
} from "../httpTransport";
import type { LawReference, LawSection } from "../types";
import {
  buildArticleHtmlUrl,
  findSectionPart,
  mapNeurisToLawSection,
  sectionNameFromReference,
  selectLegislationByExactAbbreviation,
  type NeurisCollection,
  type NeurisLegislationExpression,
} from "./neurisMapping";

const DEFAULT_BASE_URL = "https://testphase.rechtsinformationen.bund.de";

export class NeurisLawProvider implements LawProvider {
  readonly id = "neuris";
  readonly label = "Rechtsinformationen des Bundes";

  constructor(
    private readonly baseUrl = DEFAULT_BASE_URL,
    private readonly fetchFn: LawProviderHttpTransport = createFetchLawProviderTransport(),
  ) {}

  async getSection(reference: LawReference): Promise<LawSection | null> {
    try {
      const searchUrl = new URL("/v1/legislation", this.baseUrl);
      searchUrl.searchParams.set("searchTerm", reference.lawCode);
      searchUrl.searchParams.set("size", "10");
      searchUrl.searchParams.set("pageIndex", "0");

      const searchResponse = await this.getJson<NeurisCollection<NeurisLegislationExpression>>(
        searchUrl.toString(),
      );
      const searchResult = selectLegislationByExactAbbreviation(
        searchResponse,
        reference.lawCode,
      );
      if (!searchResult) {
        return null;
      }

      const expression = await this.getJson<NeurisLegislationExpression>(
        new URL(searchResult["@id"], this.baseUrl).toString(),
      );
      const sectionPart = findSectionPart(
        expression.hasPart,
        sectionNameFromReference(reference),
      );
      if (!sectionPart) {
        return null;
      }

      const articleUrl = buildArticleHtmlUrl(expression, sectionPart, this.baseUrl);
      if (!articleUrl) {
        return null;
      }

      const articleHtml = await this.getText(articleUrl);
      return mapNeurisToLawSection({
        expression,
        reference,
        sectionPart,
        articleHtml,
        articleUrl,
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
        "NeuRIS lookup failed before a definitive not-found result.",
        error,
      );
    }
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await this.request(url);
    if (!response.ok) {
      throw new LawProviderUnavailableError(
        this.id,
        `NeuRIS request failed: ${url}`,
      );
    }

    try {
      return response.json() as Promise<T>;
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `NeuRIS JSON parsing failed: ${url}`,
        error,
      );
    }
  }

  private async getText(url: string): Promise<string> {
    const response = await this.request(url);
    if (!response.ok) {
      throw new LawProviderUnavailableError(
        this.id,
        `NeuRIS request failed: ${url}`,
      );
    }

    try {
      return response.text();
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `NeuRIS text parsing failed: ${url}`,
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
        `NeuRIS request failed: ${url}`,
        error,
      );
    }
  }
}
