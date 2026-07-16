import { App, Plugin, PluginSettingTab, requestUrl, Setting, moment } from "obsidian";
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
} from "./law/providers/gesetzeImInternetMapping";
import {
  getSupportedRisLaws,
} from "./law/providers/risMapping";
import {
  getSupportedFedlexLaws,
} from "./law/providers/fedlexMapping";
import type { LawSection, LawSourceVariant } from "./law/types";
import {
  defaultLawSourceVariantForLanguage,
  getUiStrings,
  type UiStrings,
} from "./ui/i18n";
import { LawLookupModal } from "./ui/LawLookupModal";

interface SupportedLaw {
  displayLawCode: string;
  lawTitle: string;
  referenceType: "section" | "article";
  exampleInputs: readonly string[];
}

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
      requestUrl,
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

    const tabsContainer = containerEl.createDiv({ cls: "de-law-settings-jurisdiction-tabs" });
    tabsContainer.setAttribute("role", "tablist");

    const tabDefs = [
      { label: ui.jurisdictionGermany, tabId: "de-law-jurisdiction-tab-germany", panelId: "de-law-jurisdiction-panel-germany" },
      { label: ui.jurisdictionAustria, tabId: "de-law-jurisdiction-tab-austria", panelId: "de-law-jurisdiction-panel-austria" },
      { label: ui.jurisdictionSwitzerland, tabId: "de-law-jurisdiction-tab-switzerland", panelId: "de-law-jurisdiction-panel-switzerland" },
    ];

    const tabs: HTMLButtonElement[] = [];
    const panels: HTMLDivElement[] = [];

    for (const [i, def] of tabDefs.entries()) {
      const tab = tabsContainer.createEl("button", {
        cls: "de-law-settings-jurisdiction-tab",
        text: def.label,
        attr: { type: "button" },
      });
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", i === 0 ? "true" : "false");
      tab.setAttribute("aria-controls", def.panelId);
      tab.id = def.tabId;
      tab.tabIndex = i === 0 ? 0 : -1;
      tabs.push(tab);

      const panel = containerEl.createDiv({ cls: "de-law-settings-jurisdiction-panel" });
      panel.setAttribute("role", "tabpanel");
      panel.id = def.panelId;
      panel.setAttribute("aria-labelledby", def.tabId);
      if (i !== 0) panel.setAttribute("hidden", "");
      panels.push(panel);
    }

    const germanLaws = getSupportedGesetzeImInternetLaws();
    this.renderSupportedLawsGroup(panels[0], ui.sectionReferences, germanLaws.filter((l) => l.referenceType === "section"), ui);
    this.renderSupportedLawsGroup(panels[0], ui.articleReferences, germanLaws.filter((l) => l.referenceType === "article"), ui);

    const germanNotes = panels[0].createDiv({ cls: "de-law-settings-supported-notes" });
    germanNotes.createEl("strong", { text: ui.intentionallyUnsupportedCandidates });
    const germanNoteList = germanNotes.createEl("ul");
    germanNoteList.createEl("li", { text: ui.ggArticleOnlyNote });
    germanNoteList.createEl("li", { text: ui.unsupportedCandidatesNote });

    const austrianLaws = getSupportedRisLaws();
    this.renderSupportedLawsGroup(panels[1], ui.sectionReferences, austrianLaws.filter((l) => l.referenceType === "section"), ui);
    this.renderSupportedLawsGroup(panels[1], ui.articleReferences, austrianLaws.filter((l) => l.referenceType === "article"), ui);

    const swissLaws = getSupportedFedlexLaws();
    this.renderSupportedLawsGroup(panels[2], ui.articleReferences, swissLaws.filter((l) => l.referenceType === "article"), ui);

    const allTabs = tabs;
    const allPanels = panels;

    function switchTab(activeIndex: number): void {
      allTabs.forEach((tab, i) => {
        const isActive = i === activeIndex;
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });
      allPanels.forEach((panel, i) => {
        if (i === activeIndex) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
      allTabs[activeIndex].focus();
    }

    allTabs.forEach((tab, i) => {
      tab.addEventListener("click", () => switchTab(i));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          switchTab((i - 1 + allTabs.length) % allTabs.length);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          switchTab((i + 1) % allTabs.length);
        } else if (e.key === "Home") {
          e.preventDefault();
          switchTab(0);
        } else if (e.key === "End") {
          e.preventDefault();
          switchTab(allTabs.length - 1);
        }
      });
    });
  }

  private renderSupportedLawsGroup(
    containerEl: HTMLElement,
    heading: string,
    laws: readonly SupportedLaw[],
    ui: UiStrings,
  ): void {
    if (laws.length === 0) return;

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

function safeGetObsidianLanguage(): string  {
  try {
    return moment.locale();
  } catch {
    return "en";
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
