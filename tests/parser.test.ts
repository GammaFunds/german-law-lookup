import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseLawReference } from "../src/parser";

describe("parseLawReference", () => {
  it("parses law-code-first references with section sign", () => {
    assert.deepEqual(parseLawReference("KAGB § 1"), {
      lawCode: "KAGB",
      section: "1",
    });
  });

  it("parses law-code-first references without section sign", () => {
    assert.deepEqual(parseLawReference("BGB 823"), {
      lawCode: "BGB",
      section: "823",
    });
  });

  it("parses section-first references", () => {
    assert.deepEqual(parseLawReference("§ 823 BGB"), {
      lawCode: "BGB",
      section: "823",
    });
  });

  it("returns null for unsupported input", () => {
    assert.equal(parseLawReference("not a law reference"), null);
  });
});

