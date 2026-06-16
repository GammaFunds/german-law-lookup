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
import type { LawSection, LawSourceVariant } from "./law/types";
import {
  defaultLawSourceVariantForLanguage,
  getUiStrings,
  type UiStrings,
} from "./ui/i18n";
import { LawLookupModal } from "./ui/LawLookupModal";

interface DeLawPluginSettings {
  enableMockLawProvider: boolean;
  enableLawSectionCache: boolean;
  lawSectionCacheTtlDays: number | null;
  defaultLawSourceVariant: LawSourceVariant;
  showInsertedSourceMetadata: boolean;
}

interface DeLawPluginData extends Partial<DeLawPluginSettings> {
  lawSectionCache?: Record<string, LawSection>;
}

const DEFAULT_SETTINGS: DeLawPluginSettings = {
  enableMockLawProvider: false,
  enableLawSectionCache: true,
  lawSectionCacheTtlDays: null,
  defaultLawSourceVariant: "official-de",
  showInsertedSourceMetadata: true,
};

export default class DeLawPlugin extends Plugin {
  private providerRegistry!: ProviderRegistry;
  private settings: DeLawPluginSettings = { ...DEFAULT_SETTINGS };
  private readonly uiStrings = getUiStrings(safeGetObsidianLanguage());

  async onload() {
    this.settings = await this.loadSettings();
    this.rebuildProviderRegistry();

    this.addSettingTab(new DeLawSettingsTab(this.app, this));

    this.addCommand({
      id: "deutsches-gesetz-nachschlagen",
      name: this.uiStrings.commandName,
      callback: () => {
        new LawLookupModal(
          this.app,
          this.providerRegistry,
          {
            getDefaultLawSourceVariant: () =>
              this.settings.defaultLawSourceVariant,
            getShowInsertedSourceMetadata: () =>
              this.settings.showInsertedSourceMetadata,
            setShowInsertedSourceMetadata: async (value) => {
              await this.updateSettings({ showInsertedSourceMetadata: value });
            },
          },
          this.uiStrings,
        ).open();
      },
    });
  }

  getSettings(): DeLawPluginSettings {
    return this.settings;
  }

  getUiStrings(): UiStrings {
    return this.uiStrings;
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
      defaultLawSourceVariant: defaultLawSourceVariantForLanguage(
        safeGetObsidianLanguage(),
        storedSettings?.defaultLawSourceVariant,
      ),
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
    const ui = this.plugin.getUiStrings();

    containerEl.empty();

    new Setting(containerEl)
      .setName(ui.enableLocalLawTextCache)
      .setDesc(ui.enableLocalLawTextCacheDescription)
      .addToggle((toggle) => {
        toggle
          .setValue(settings.enableLawSectionCache)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ enableLawSectionCache: value });
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(ui.defaultLawTextSource)
      .addDropdown((dropdown) => {
        dropdown
          .addOption("official-de", ui.germanOfficialText)
          .addOption("translation-en", ui.englishTranslationWhenAvailable)
          .setValue(settings.defaultLawSourceVariant)
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              defaultLawSourceVariant:
                value === "translation-en" ? "translation-en" : "official-de",
            });
          });
      });

    new Setting(containerEl)
      .setName(ui.cacheExpirationInDays)
      .setDesc(ui.cacheExpirationInDaysDescription)
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setDisabled(!settings.enableLawSectionCache)
          .setPlaceholder(ui.noExpirationPlaceholder)
          .setValue(settings.lawSectionCacheTtlDays == null ? "" : String(settings.lawSectionCacheTtlDays))
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              lawSectionCacheTtlDays: normalizeTtlDays(value),
            });
          });
      });

    new Setting(containerEl).setName(ui.supportedLaws).setHeading();
    containerEl.createEl("p", {
      cls: "de-law-settings-supported-description",
      text: ui.supportedLawsDescription,
    });

    this.renderSupportedLawsGroup(containerEl, ui.sectionReferences, "section", ui);
    this.renderSupportedLawsGroup(containerEl, ui.articleReferences, "article", ui);

    const notes = containerEl.createDiv({ cls: "de-law-settings-supported-notes" });
    notes.createEl("strong", { text: ui.intentionallyUnsupportedCandidates });
    const noteList = notes.createEl("ul");
    noteList.createEl("li", {
      text: ui.ggArticleOnlyNote,
    });
    noteList.createEl("li", {
      text: ui.unsupportedCandidatesNote,
    });
  }

  private renderSupportedLawsGroup(
    containerEl: HTMLElement,
    heading: string,
    referenceType: SupportedGesetzeImInternetLaw["referenceType"],
    ui: UiStrings,
  ): void {
    const laws = getSupportedGesetzeImInternetLaws().filter(
      (law) => law.referenceType === referenceType,
    );

    new Setting(containerEl).setName(heading).setHeading();
    const table = containerEl.createDiv({ cls: "de-law-settings-supported-table" });
    const headerRow = table.createDiv({
      cls: "de-law-settings-supported-row de-law-settings-supported-row-header",
    });
    headerRow.createEl("div", { text: ui.code });
    headerRow.createEl("div", { text: ui.law });
    headerRow.createEl("div", { text: ui.referenceType });
    headerRow.createEl("div", { text: ui.examples });

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

function safeGetObsidianLanguage(): string {
  return "en";
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
