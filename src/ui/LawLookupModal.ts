import { App, MarkdownView, Modal, Notice, Setting } from "obsidian";
import { formatLawSectionAsMarkdown } from "../law/CitationFormatter";
import { ProviderRegistry } from "../law/ProviderRegistry";
import type { LawSection } from "../law/types";
import { parseLawReference } from "../parser";
import { LookupSequence } from "./LookupSequence";
import { insertMarkdownIntoMarkdownView } from "./editorInsertion";

interface LawLookupModalSettingsStore {
  getShowInsertedSourceMetadata(): boolean;
  setShowInsertedSourceMetadata(value: boolean): Promise<void>;
}

export class LawLookupModal extends Modal {
  private inputEl!: HTMLInputElement;
  private resultEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private currentSection: LawSection | null = null;
  private currentMarkdown = "";
  private showInsertedSourceMetadata = true;
  private readonly lookupSequence = new LookupSequence();

  constructor(
    app: App,
    private readonly providerRegistry: ProviderRegistry,
    private readonly settingsStore: LawLookupModalSettingsStore,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("de-law-lookup-modal");

    contentEl.createEl("h2", { text: "Deutsches Gesetz nachschlagen" });

    const formEl = contentEl.createDiv({ cls: "de-law-lookup-form" });
    this.inputEl = formEl.createEl("input", {
      type: "text",
      placeholder: "z. B. § 823 BGB",
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.renderParsedReference();
      }
    });

    const searchButton = formEl.createEl("button", { text: "Suchen" });
    searchButton.addEventListener("click", () => this.renderParsedReference());

    this.resultEl = contentEl.createDiv({ cls: "de-law-lookup-result" });
    this.resultEl.setText("Noch keine Suche ausgeführt.");
    this.actionsEl = contentEl.createDiv({ cls: "de-law-lookup-actions" });
    this.showInsertedSourceMetadata =
      this.settingsStore.getShowInsertedSourceMetadata();
    this.renderActions();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async renderParsedReference() {
    const lookupId = this.lookupSequence.next();
    const parsed = parseLawReference(this.inputEl.value);
    this.currentSection = null;
    this.currentMarkdown = "";
    this.renderActions();

    if (!parsed) {
      this.resultEl.setText("Keine erkannte Fundstelle.");
      return;
    }

    this.resultEl.setText("Suche läuft...");

    try {
      const section = await this.providerRegistry.getSection(parsed);
      if (!this.lookupSequence.isCurrent(lookupId)) {
        return;
      }

      this.currentSection = section;
      this.currentMarkdown = this.formatCurrentSection();
      this.resultEl.setText(this.currentMarkdown);
      this.renderActions();
    } catch (error) {
      if (!this.lookupSequence.isCurrent(lookupId)) {
        return;
      }

      this.currentSection = null;
      this.resultEl.setText(
        error instanceof Error ? error.message : "Keine Fundstelle gefunden.",
      );
    }
  }

  private renderActions() {
    this.actionsEl.empty();

    new Setting(this.actionsEl)
      .setName("Quellen- und Cache-Hinweis einfügen")
      .addToggle((toggle) => {
        toggle.setValue(this.showInsertedSourceMetadata).onChange((value) => {
          this.showInsertedSourceMetadata = value;
          void this.settingsStore.setShowInsertedSourceMetadata(value);

          if (!this.currentSection) {
            return;
          }

          this.currentMarkdown = this.formatCurrentSection();
          this.resultEl.setText(this.currentMarkdown);
        });
      });

    if (!this.currentSection) {
      return;
    }

    const button = this.actionsEl.createEl("button", {
      text: "In aktuelle Note einfügen",
    });

    button.addEventListener("click", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice("Kein aktiver Markdown-Editor gefunden.");
        return;
      }

      insertMarkdownIntoMarkdownView(view, this.currentMarkdown);
    });
  }

  private formatCurrentSection(): string {
    if (!this.currentSection) {
      return "";
    }

    return formatLawSectionAsMarkdown(this.currentSection, {
      includeMetadataFooter: this.showInsertedSourceMetadata,
    });
  }
}
