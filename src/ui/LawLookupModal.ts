import { App, MarkdownView, Modal, Notice } from "obsidian";
import { formatLawSectionAsMarkdown } from "../law/CitationFormatter";
import { ProviderRegistry } from "../law/ProviderRegistry";
import { parseLawReference } from "../parser";
import { LookupSequence } from "./LookupSequence";
import { insertMarkdownIntoMarkdownView } from "./editorInsertion";

export class LawLookupModal extends Modal {
  private inputEl!: HTMLInputElement;
  private resultEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private currentMarkdown = "";
  private readonly lookupSequence = new LookupSequence();

  constructor(
    app: App,
    private readonly providerRegistry: ProviderRegistry,
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
      placeholder: "z. B. BGB 823",
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
  }

  onClose() {
    this.contentEl.empty();
  }

  private async renderParsedReference() {
    const lookupId = this.lookupSequence.next();
    const parsed = parseLawReference(this.inputEl.value);
    this.currentMarkdown = "";
    this.actionsEl.empty();

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

      this.currentMarkdown = formatLawSectionAsMarkdown(section);
      this.resultEl.setText(this.currentMarkdown);
      this.renderInsertButton();
    } catch (error) {
      if (!this.lookupSequence.isCurrent(lookupId)) {
        return;
      }

      this.resultEl.setText(
        error instanceof Error ? error.message : "Keine Fundstelle gefunden.",
      );
    }
  }

  private renderInsertButton() {
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
}
