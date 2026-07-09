import { App, MarkdownView, Modal, Notice, Setting } from "obsidian";
import { formatLawSectionAsMarkdown } from "../law/CitationFormatter";
import { LawTranslationUnavailableError } from "../law/errors";
import { ProviderRegistry } from "../law/ProviderRegistry";
import type { LawJurisdiction, LawSection, LawSourceVariant } from "../law/types";
import { parseLawReferenceWithSelectedJurisdiction } from "../parser";
import { LookupSequence } from "./LookupSequence";
import { insertMarkdownIntoMarkdownView } from "./editorInsertion";
import type { UiStrings } from "./i18n";
import { buildLawSectionPreviewModel } from "./lawSectionPreview";

interface LawLookupModalSettingsStore {
  getDefaultLawSourceVariant(): LawSourceVariant;
  getShowInsertedSourceMetadata(): boolean;
  setShowInsertedSourceMetadata(value: boolean): Promise<void>;
}

export class LawLookupModal extends Modal {
  private inputEl!: HTMLInputElement;
  private resultEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private currentSection: LawSection | null = null;
  private currentMarkdown = "";
  private selectedSourceVariant: LawSourceVariant = "official-de";
  private selectedJurisdiction: LawJurisdiction = "DE";
  private showInsertedSourceMetadata = true;
  private readonly lookupSequence = new LookupSequence();

  constructor(
    app: App,
    private readonly providerRegistry: ProviderRegistry,
    private readonly settingsStore: LawLookupModalSettingsStore,
    private readonly ui: UiStrings,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("de-law-lookup-modal");

    contentEl.createEl("h2", { text: this.ui.lookUpLawTitle });

    const formEl = contentEl.createDiv({ cls: "de-law-lookup-form" });
    this.inputEl = formEl.createEl("input", {
      type: "text",
      placeholder: this.ui.lawReferencePlaceholder,
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void this.renderParsedReference();
      }
    });

    const jurisdictionSelect = formEl.createEl("select", {
      cls: "de-law-jurisdiction-select",
    });
    jurisdictionSelect.createEl("option", {
      value: "DE",
      text: this.ui.jurisdictionGermany,
    });
    jurisdictionSelect.createEl("option", {
      value: "AT",
      text: this.ui.jurisdictionAustria,
    });
    jurisdictionSelect.addEventListener("change", () => {
      this.selectedJurisdiction = jurisdictionSelect.value as LawJurisdiction;
      if (this.inputEl?.value.trim()) {
        void this.renderParsedReference();
      }
    });

    const searchButton = formEl.createEl("button", { text: this.ui.lookUpLawButton });
    searchButton.addEventListener("click", () => {
      void this.renderParsedReference();
    });

    this.resultEl = contentEl.createDiv({ cls: "de-law-lookup-result" });
    this.renderResultMessage(this.ui.noLookupRunYet);
    this.actionsEl = contentEl.createDiv({ cls: "de-law-lookup-actions" });
    this.selectedSourceVariant = this.settingsStore.getDefaultLawSourceVariant();
    this.showInsertedSourceMetadata =
      this.settingsStore.getShowInsertedSourceMetadata();
    this.renderActions();
  }

  onClose() {
    this.contentEl.empty();
  }

  private async renderParsedReference() {
    const lookupId = this.lookupSequence.next();
    const parsedReference = parseLawReferenceWithSelectedJurisdiction(
      this.inputEl.value,
      this.selectedJurisdiction,
    );
    this.currentSection = null;
    this.currentMarkdown = "";
    this.renderActions();

    if (!parsedReference) {
      this.renderResultMessage(this.ui.noRecognizedCitation);
      return;
    }

    const parsed = {
      ...parsedReference,
      sourceVariant: this.selectedSourceVariant,
    };

    this.renderResultMessage(this.ui.lookingUpLaw);

    try {
      const section = await this.providerRegistry.getSection(parsed);
      if (!this.lookupSequence.isCurrent(lookupId)) {
        return;
      }

      this.currentSection = section;
      this.currentMarkdown = this.formatCurrentSection();
      this.renderCurrentPreview();
      this.renderActions();
    } catch (error) {
      if (!this.lookupSequence.isCurrent(lookupId)) {
        return;
      }

      this.currentSection = null;
      this.renderResultMessage(
        error instanceof LawTranslationUnavailableError
          ? this.ui.englishTranslationUnavailableForCitation
          : error instanceof Error
            ? error.message
            : this.ui.noCitationFound,
      );
    }
  }

  private renderActions() {
    this.actionsEl.empty();

    new Setting(this.actionsEl)
      .setName(this.ui.useEnglishTranslationWhenAvailable)
      .addToggle((toggle) => {
        toggle
          .setValue(this.selectedSourceVariant === "translation-en")
          .onChange((value) => {
            this.selectedSourceVariant = value ? "translation-en" : "official-de";
            if (this.inputEl?.value.trim()) {
              void this.renderParsedReference();
            }
          });
      });

    new Setting(this.actionsEl)
      .setName(this.ui.insertSourceAndCacheNote)
      .addToggle((toggle) => {
        toggle.setValue(this.showInsertedSourceMetadata).onChange((value) => {
          this.showInsertedSourceMetadata = value;
          void this.settingsStore.setShowInsertedSourceMetadata(value);

          if (!this.currentSection) {
            return;
          }

          this.currentMarkdown = this.formatCurrentSection();
          this.renderCurrentPreview();
        });
      });

    if (!this.currentSection) {
      return;
    }

    const button = this.actionsEl.createEl("button", {
      text: this.ui.insertIntoCurrentNote,
    });

    button.addEventListener("click", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice(this.ui.noActiveMarkdownEditorFound);
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

  private renderCurrentPreview() {
    if (!this.currentSection) {
      this.renderResultMessage(this.ui.noCitationFound);
      return;
    }

    const preview = buildLawSectionPreviewModel(this.currentSection, {
      includeMetadataFooter: this.showInsertedSourceMetadata,
    });

    this.resultEl.empty();

    this.resultEl.createEl("div", {
      cls: "de-law-lookup-preview-title",
      text: preview.title,
    });

    const bodyEl = this.resultEl.createDiv({ cls: "de-law-lookup-preview-body" });
    for (const paragraph of preview.paragraphs) {
      bodyEl.createEl("p", {
        cls: "de-law-lookup-preview-paragraph",
        text: paragraph,
      });
    }

    if (preview.metadataLines.length > 0) {
      const metadataEl = this.resultEl.createDiv({
        cls: "de-law-lookup-preview-metadata",
      });

      for (const line of preview.metadataLines) {
        metadataEl.createEl("div", {
          cls: "de-law-lookup-preview-metadata-line",
          text: line,
        });
      }
    }
  }

  private renderResultMessage(message: string) {
    this.resultEl.empty();
    this.resultEl.createEl("div", {
      cls: "de-law-lookup-result-message",
      text: message,
    });
  }
}
