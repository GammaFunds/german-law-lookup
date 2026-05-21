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

  it("parses explicit spaced SGB law-code-first references", () => {
    assert.deepEqual(parseLawReference("SGB V § 1"), {
      lawCode: "SGB V",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB III § 1"), {
      lawCode: "SGB III",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB IX 1"), {
      lawCode: "SGB IX",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB X 1"), {
      lawCode: "SGB X",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB XIV 1"), {
      lawCode: "SGB XIV",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB I 1"), {
      lawCode: "SGB I",
      section: "1",
    });
    assert.deepEqual(parseLawReference("SGB II 1"), {
      lawCode: "SGB II",
      section: "1",
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

  it("parses explicit spaced SGB section-first references", () => {
    assert.deepEqual(parseLawReference("§ 1 SGB V"), {
      lawCode: "SGB V",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 SGB III"), {
      lawCode: "SGB III",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 SGB IX"), {
      lawCode: "SGB IX",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 SGB X"), {
      lawCode: "SGB X",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 SGB XIV"), {
      lawCode: "SGB XIV",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 SGB I"), {
      lawCode: "SGB I",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 SGB II"), {
      lawCode: "SGB II",
      section: "1",
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
