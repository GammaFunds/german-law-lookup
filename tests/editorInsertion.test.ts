import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  insertMarkdownIntoMarkdownView,
  type MarkdownViewLike,
} from "../src/ui/editorInsertion";

describe("editor insertion helpers", () => {
  it("inserts markdown at the active markdown cursor position", () => {
    let inserted = "";
    const view: MarkdownViewLike = {
      editor: {
        replaceSelection(text: string) {
          inserted = text;
        },
      },
    };

    insertMarkdownIntoMarkdownView(view, "> test markdown");

    assert.equal(inserted, "> test markdown");
  });
});
