import { App, MarkdownView, Modal, Notice, Setting } from "obsidian";
import { formatLawSectionAsMarkdown } from "../law/CitationFormatter";
import { ProviderRegistry } from "../law/ProviderRegistry";
import type { LawSection } from "../law/types";
import { parseLawReference } from "../parser";
import { LookupSequence } from "./LookupSequence";
import { insertMarkdownIntoMarkdownView } from "./editorInsertion";
import { buildLawSectionPreviewModel } from "./lawSectionPreview";

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

    contentEl.createEl("h2", { text: "Look up law" });

    const formEl = contentEl.createDiv({ cls: "de-law-lookup-form" });
    this.inputEl = formEl.createEl("input", {
      type: "text",
      placeholder: "e.g. § 823 BGB",
    });
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.renderParsedReference();
      }
    });

    const searchButton = formEl.createEl("button", { text: "Look up" });
    searchButton.addEventListener("click", () => this.renderParsedReference());

    this.resultEl = contentEl.createDiv({ cls: "de-law-lookup-result" });
    this.renderResultMessage("No lookup run yet.");
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
      this.renderResultMessage("No recognized citation.");
      return;
    }

    this.renderResultMessage("Looking up law...");

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
        error instanceof Error ? error.message : "No citation found.",
      );
    }
  }

  private renderActions() {
    this.actionsEl.empty();

    new Setting(this.actionsEl)
      .setName("Insert source and cache note")
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
      text: "Insert into current note",
    });

    button.addEventListener("click", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice("No active Markdown editor found.");
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
      this.renderResultMessage("No citation found.");
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
