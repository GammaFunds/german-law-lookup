import { Plugin, requestUrl } from "obsidian";
import { ProviderRegistry } from "./law/ProviderRegistry";
import { createObsidianRequestUrlTransport } from "./law/httpTransport";
import { buildLawProviders } from "./law/providerComposition";
import { LawLookupModal } from "./ui/LawLookupModal";

interface DeLawPluginSettings {
  enableMockLawProvider: boolean;
}

const DEFAULT_SETTINGS: DeLawPluginSettings = {
  enableMockLawProvider: false,
};

export default class DeLawPlugin extends Plugin {
  private providerRegistry!: ProviderRegistry;

  async onload() {
    const settings = await this.loadSettings();
    this.providerRegistry = new ProviderRegistry(
      buildLawProviders({
        ...settings,
        httpTransport: createObsidianRequestUrlTransport(requestUrl),
      }),
    );

    this.addCommand({
      id: "deutsches-gesetz-nachschlagen",
      name: "Deutsches Gesetz nachschlagen",
      callback: () => {
        new LawLookupModal(this.app, this.providerRegistry).open();
      },
    });
  }

  private async loadSettings(): Promise<DeLawPluginSettings> {
    const storedSettings = (await this.loadData()) as Partial<DeLawPluginSettings> | null;

    return {
      ...DEFAULT_SETTINGS,
      enableMockLawProvider: storedSettings?.enableMockLawProvider === true,
    };
  }
}
