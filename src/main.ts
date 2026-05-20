import { App, Plugin, PluginSettingTab, requestUrl, Setting } from "obsidian";
import {
  StoredLawSectionCache,
  type LawSectionCacheStorage,
} from "./law/LawSectionCache";
import { ProviderRegistry } from "./law/ProviderRegistry";
import { buildCachedLawProviders } from "./law/cachedProviderComposition";
import { createObsidianRequestUrlTransport } from "./law/httpTransport";
import { buildLawProviders } from "./law/providerComposition";
import type { LawSection } from "./law/types";
import { LawLookupModal } from "./ui/LawLookupModal";

interface DeLawPluginSettings {
  enableMockLawProvider: boolean;
  enableLawSectionCache: boolean;
  lawSectionCacheTtlDays: number | null;
  showInsertedSourceMetadata: boolean;
}

interface DeLawPluginData extends Partial<DeLawPluginSettings> {
  lawSectionCache?: Record<string, LawSection>;
}

const DEFAULT_SETTINGS: DeLawPluginSettings = {
  enableMockLawProvider: false,
  enableLawSectionCache: true,
  lawSectionCacheTtlDays: null,
  showInsertedSourceMetadata: true,
};

export default class DeLawPlugin extends Plugin {
  private providerRegistry!: ProviderRegistry;
  private settings: DeLawPluginSettings = { ...DEFAULT_SETTINGS };

  async onload() {
    this.settings = await this.loadSettings();
    this.rebuildProviderRegistry();

    this.addSettingTab(new DeLawSettingsTab(this.app, this));

    this.addCommand({
      id: "deutsches-gesetz-nachschlagen",
      name: "Deutsches Gesetz nachschlagen",
      callback: () => {
        new LawLookupModal(this.app, this.providerRegistry, {
          getShowInsertedSourceMetadata: () =>
            this.settings.showInsertedSourceMetadata,
          setShowInsertedSourceMetadata: async (value) => {
            await this.updateSettings({ showInsertedSourceMetadata: value });
          },
        }).open();
      },
    });
  }

  getSettings(): DeLawPluginSettings {
    return this.settings;
  }

  async updateSettings(patch: Partial<DeLawPluginSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...patch,
    };
    await this.saveSettings();
    this.rebuildProviderRegistry();
  }

  private rebuildProviderRegistry() {
    const runtimeProviders = buildLawProviders({
      ...this.settings,
      httpTransport: createObsidianRequestUrlTransport(requestUrl),
    });
    const cache = new StoredLawSectionCache(this.createLawSectionCacheStorage());
    this.providerRegistry = new ProviderRegistry(
      buildCachedLawProviders(runtimeProviders, cache, this.settings),
    );
  }

  private async loadSettings(): Promise<DeLawPluginSettings> {
    const storedSettings = (await this.loadData()) as DeLawPluginData | null;

    return {
      ...DEFAULT_SETTINGS,
      enableMockLawProvider: storedSettings?.enableMockLawProvider === true,
      enableLawSectionCache: storedSettings?.enableLawSectionCache !== false,
      lawSectionCacheTtlDays: normalizeTtlDays(storedSettings?.lawSectionCacheTtlDays),
      showInsertedSourceMetadata:
        storedSettings?.showInsertedSourceMetadata !== false,
    };
  }

  private async saveSettings(): Promise<void> {
    const storedData = ((await this.loadData()) as DeLawPluginData | null) ?? {};
    await this.saveData({
      ...storedData,
      ...this.settings,
    });
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

class DeLawSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: DeLawPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();

    containerEl.empty();

    new Setting(containerEl)
      .setName("Lokalen Gesetzestext-Cache aktivieren")
      .setDesc("Speichert erfolgreiche Treffer lokal. Live-Anbieter werden weiterhin zuerst abgefragt.")
      .addToggle((toggle) => {
        toggle
          .setValue(settings.enableLawSectionCache)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ enableLawSectionCache: value });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Cache-Ablauf in Tagen")
      .setDesc("Leer lassen, um gecachte Treffer ohne Ablauf als Fallback zu verwenden.")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setDisabled(!settings.enableLawSectionCache)
          .setPlaceholder("kein Ablauf")
          .setValue(settings.lawSectionCacheTtlDays == null ? "" : String(settings.lawSectionCacheTtlDays))
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              lawSectionCacheTtlDays: normalizeTtlDays(value),
            });
          });
      });
  }
}

function normalizeTtlDays(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
