import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseLawReference } from "../src/parser";

describe("parseLawReference", () => {
  it("parses GG article-first references", () => {
    assert.deepEqual(parseLawReference("Art. 1 GG"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Artikel 1 GG"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Art 1 GG"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });
  });

  it("parses GG law-code-first article references", () => {
    assert.deepEqual(parseLawReference("GG Art. 1"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("GG Artikel 1"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
    });
  });

  it("parses law-code-first references with section sign", () => {
    assert.deepEqual(parseLawReference("KAGB § 1"), {
      lawCode: "KAGB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("BGB § 823"), {
      lawCode: "BGB",
      section: "823",
    });
    assert.deepEqual(parseLawReference("StGB § 242"), {
      lawCode: "STGB",
      section: "242",
    });
  });

  it("parses law-code-first references without section sign", () => {
    assert.deepEqual(parseLawReference("BGB 823"), {
      lawCode: "BGB",
      section: "823",
    });
    assert.deepEqual(parseLawReference("GwG 10"), {
      lawCode: "GWG",
      section: "10",
    });
    assert.deepEqual(parseLawReference("StGB 242"), {
      lawCode: "STGB",
      section: "242",
    });
  });

  it("parses section-first references with section sign", () => {
    assert.deepEqual(parseLawReference("§ 823 BGB"), {
      lawCode: "BGB",
      section: "823",
    });
    assert.deepEqual(parseLawReference("§ 242 StGB"), {
      lawCode: "STGB",
      section: "242",
    });
  });

  it("parses section-first references without section sign", () => {
    assert.deepEqual(parseLawReference("823 BGB"), {
      lawCode: "BGB",
      section: "823",
    });
    assert.deepEqual(parseLawReference("823a BGB"), {
      lawCode: "BGB",
      section: "823a",
    });
    assert.deepEqual(parseLawReference("312g BGB"), {
      lawCode: "BGB",
      section: "312g",
    });
    assert.deepEqual(parseLawReference("312G BGB"), {
      lawCode: "BGB",
      section: "312G",
    });
    assert.deepEqual(parseLawReference("242 StGB"), {
      lawCode: "STGB",
      section: "242",
    });
  });

  it("returns null for unsupported input", () => {
    assert.equal(parseLawReference("not a law reference"), null);
    assert.equal(parseLawReference("Art. 1 BGB"), null);
  });
});
