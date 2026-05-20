import { Plugin, requestUrl } from "obsidian";
import {
  CachedLawProvider,
  StoredLawSectionCache,
  type LawSectionCacheStorage,
} from "./law/LawSectionCache";
import type { LawProvider } from "./law/LawProvider";
import { ProviderRegistry } from "./law/ProviderRegistry";
import { createObsidianRequestUrlTransport } from "./law/httpTransport";
import { buildLawProviders } from "./law/providerComposition";
import type { LawSection } from "./law/types";
import { LawLookupModal } from "./ui/LawLookupModal";

interface DeLawPluginSettings {
  enableMockLawProvider: boolean;
}

interface DeLawPluginData extends Partial<DeLawPluginSettings> {
  lawSectionCache?: Record<string, LawSection>;
}

const DEFAULT_SETTINGS: DeLawPluginSettings = {
  enableMockLawProvider: false,
};

export default class DeLawPlugin extends Plugin {
  private providerRegistry!: ProviderRegistry;

  async onload() {
    const settings = await this.loadSettings();
    const allowedCachedProviderIds = settings.enableMockLawProvider
      ? ["neuris", "gesetze-im-internet", "mock"]
      : ["neuris", "gesetze-im-internet"];
    const runtimeProviders = buildLawProviders({
      ...settings,
      httpTransport: createObsidianRequestUrlTransport(requestUrl),
    });
    const providerChain = createProviderChain(runtimeProviders);
    const cache = new StoredLawSectionCache(this.createLawSectionCacheStorage());
    this.providerRegistry = new ProviderRegistry(
      [
        new CachedLawProvider(
          providerChain,
          cache,
          {
            allowedProviderIds: allowedCachedProviderIds,
          },
        ),
      ],
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
    const storedSettings = (await this.loadData()) as DeLawPluginData | null;

    return {
      ...DEFAULT_SETTINGS,
      enableMockLawProvider: storedSettings?.enableMockLawProvider === true,
    };
  }

  private createLawSectionCacheStorage(): LawSectionCacheStorage {
    return {
      load: async () => {
        const storedData = (await this.loadData()) as DeLawPluginData | null;
        return storedData?.lawSectionCache ?? null;
      },
      save: async (entries) => {
        const storedData = ((await this.loadData()) as DeLawPluginData | null) ?? {};
        await this.saveData({
          ...storedData,
          lawSectionCache: entries,
        });
      },
    };
  }
}

function createProviderChain(providers: LawProvider[]): LawProvider {
  return {
    id: "provider-chain",
    label: "Provider chain",
    async getSection(reference) {
      for (const provider of providers) {
        const section = await provider.getSection(reference);
        if (section) {
          return section;
        }
      }

      return null;
    },
  };
}
