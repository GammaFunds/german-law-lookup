import { App, Plugin, PluginSettingTab, requestUrl, Setting } from "obsidian";
import {
  StoredLawSectionCache,
  type LawSectionCacheStorage,
} from "./law/LawSectionCache";
import { ProviderRegistry } from "./law/ProviderRegistry";
import { buildCachedLawProviders } from "./law/cachedProviderComposition";
import { createObsidianRequestUrlTransport } from "./law/httpTransport";
import { buildLawProviders } from "./law/providerComposition";
import {
  getSupportedGesetzeImInternetLaws,
  type SupportedGesetzeImInternetLaw,
} from "./law/providers/gesetzeImInternetMapping";
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
      name: "Deutsches Gesetz nachschlagen / Look up German law",
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
      .setName("Enable local law text cache")
      .setDesc("Stores successful lookups locally. Live providers are still queried first.")
      .addToggle((toggle) => {
        toggle
          .setValue(settings.enableLawSectionCache)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ enableLawSectionCache: value });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Cache expiration in days")
      .setDesc("Leave empty to keep cached matches available as a fallback without expiration.")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setDisabled(!settings.enableLawSectionCache)
          .setPlaceholder("no expiration")
          .setValue(settings.lawSectionCacheTtlDays == null ? "" : String(settings.lawSectionCacheTtlDays))
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              lawSectionCacheTtlDays: normalizeTtlDays(value),
            });
          });
      });

    containerEl.createEl("h3", { text: "Supported laws" });
    containerEl.createEl("p", {
      cls: "de-law-settings-supported-description",
      text: "This list shows the laws that are explicitly supported right now. Lookups still run live through the provider chain; this view does not make any network requests.",
    });

    this.renderSupportedLawsGroup(containerEl, "Section references (§)", "section");
    this.renderSupportedLawsGroup(containerEl, "Article references (Art.)", "article");

    const notes = containerEl.createDiv({ cls: "de-law-settings-supported-notes" });
    notes.createEl("strong", { text: "Notes on intentionally unsupported candidates" });
    const noteList = notes.createEl("ul");
    noteList.createEl("li", {
      text: "GG is currently supported only for article references.",
    });
    noteList.createEl("li", {
      text: "KWG and FreizügG/EU remain follow-ups for now; SGB XIII is intentionally not supported as a current SGB book.",
    });
  }

  private renderSupportedLawsGroup(
    containerEl: HTMLElement,
    heading: string,
    referenceType: SupportedGesetzeImInternetLaw["referenceType"],
  ): void {
    const laws = getSupportedGesetzeImInternetLaws().filter(
      (law) => law.referenceType === referenceType,
    );

    containerEl.createEl("h4", { text: heading });
    const table = containerEl.createDiv({ cls: "de-law-settings-supported-table" });
    const headerRow = table.createDiv({
      cls: "de-law-settings-supported-row de-law-settings-supported-row-header",
    });
    headerRow.createEl("div", { text: "Code" });
    headerRow.createEl("div", { text: "Law" });
    headerRow.createEl("div", { text: "Reference type" });
    headerRow.createEl("div", { text: "Examples" });

    for (const law of laws) {
      const row = table.createDiv({ cls: "de-law-settings-supported-row" });
      row.createEl("div", { text: law.displayLawCode });
      row.createEl("div", { text: law.lawTitle });
      row.createEl("div", { text: law.referenceType === "article" ? "Art." : "§" });
      const examples = row.createDiv({ cls: "de-law-settings-supported-example-list" });
      for (const exampleInput of law.exampleInputs) {
        examples.createEl("span", {
          cls: "de-law-settings-supported-example",
          text: exampleInput,
        });
      }
    }
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
