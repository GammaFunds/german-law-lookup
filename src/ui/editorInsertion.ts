export interface MarkdownViewLike {
  editor: {
    replaceSelection(text: string): void;
  };
}

export function insertMarkdownIntoMarkdownView(
  view: MarkdownViewLike,
  markdown: string,
): void {
  view.editor.replaceSelection(markdown);
}
