import type { LawProvider } from "../LawProvider";
import { LawProviderUnavailableError } from "../errors";
import type { LawReference, LawSection } from "../types";
import {
  buildGesetzeImInternetSectionUrl,
  mapGesetzeImInternetToLawSection,
} from "./gesetzeImInternetMapping";

type FetchLike = (input: string) => Promise<{
  ok: boolean;
  status?: number;
  text(): Promise<string>;
}>;

const BASE_URL = "https://www.gesetze-im-internet.de";

export class GesetzeImInternetProvider implements LawProvider {
  readonly id = "gesetze-im-internet";
  readonly label = "Gesetze im Internet";

  constructor(
    private readonly baseUrl = BASE_URL,
    private readonly fetchFn: FetchLike = (input) => fetch(input),
  ) {}

  async getSection(reference: LawReference): Promise<LawSection | null> {
    const sectionUrl = buildGesetzeImInternetSectionUrl(reference, this.baseUrl);
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
          `Gesetze im Internet request failed: ${sectionUrl}`,
        );
      }

      const html = await this.getText(response, sectionUrl);
      return mapGesetzeImInternetToLawSection({
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
        "Gesetze im Internet lookup failed before a definitive not-found result.",
        error,
      );
    }
  }

  private async request(url: string): ReturnType<FetchLike> {
    try {
      return await this.fetchFn(url);
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `Gesetze im Internet request failed: ${url}`,
        error,
      );
    }
  }

  private async getText(response: Awaited<ReturnType<FetchLike>>, url: string): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      throw new LawProviderUnavailableError(
        this.id,
        `Gesetze im Internet text parsing failed: ${url}`,
        error,
      );
    }
  }
}
