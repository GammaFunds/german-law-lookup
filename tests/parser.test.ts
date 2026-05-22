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

  it("parses explicit EGBGB pure article references", () => {
    assert.deepEqual(parseLawReference("Art. 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Artikel 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Art. 1"), {
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Artikel 1"), {
      lawCode: "EGBGB",
      section: "1",
      referenceType: "article",
    });
  });

  it("parses explicit EGBGB article-section references", () => {
    assert.deepEqual(parseLawReference("Art. 229 § 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Art. 229 § 1"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Art 229 § 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Art 229 § 1"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Art. 246a § 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "246a",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Art. 246a § 1"), {
      lawCode: "EGBGB",
      section: "246a",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Artikel 229 § 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Artikel 229 § 1"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Artikel 246a § 1 EGBGB"), {
      lawCode: "EGBGB",
      section: "246a",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Artikel 246a § 1"), {
      lawCode: "EGBGB",
      section: "246a",
      subsection: "1",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Art. 229 § 6 EGBGB"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "6",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Art. 229 § 67"), {
      lawCode: "EGBGB",
      section: "229",
      subsection: "67",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("Artikel 247 § 3 EGBGB"), {
      lawCode: "EGBGB",
      section: "247",
      subsection: "3",
      referenceType: "article",
    });
    assert.deepEqual(parseLawReference("EGBGB Artikel 247 § 3"), {
      lawCode: "EGBGB",
      section: "247",
      subsection: "3",
      referenceType: "article",
    });
  });

  it("parses law-code-first references with section sign", () => {
    assert.deepEqual(parseLawReference("BDSG § 1"), {
      lawCode: "BDSG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("UWG § 1"), {
      lawCode: "UWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("VVG § 1"), {
      lawCode: "VVG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("AGG § 1"), {
      lawCode: "AGG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("GWB § 1"), {
      lawCode: "GWB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("KWG § 1"), {
      lawCode: "KWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("KAGB § 1"), {
      lawCode: "KAGB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("OWiG § 1"), {
      lawCode: "OWIG",
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
    assert.deepEqual(parseLawReference("BDSG 1"), {
      lawCode: "BDSG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("UWG 1"), {
      lawCode: "UWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("VVG 1"), {
      lawCode: "VVG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("AGG 1"), {
      lawCode: "AGG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("GWB 1"), {
      lawCode: "GWB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("KWG 1"), {
      lawCode: "KWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("OWiG 1"), {
      lawCode: "OWIG",
      section: "1",
    });
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
    assert.deepEqual(parseLawReference("§ 1 BDSG"), {
      lawCode: "BDSG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 UWG"), {
      lawCode: "UWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 VVG"), {
      lawCode: "VVG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 AGG"), {
      lawCode: "AGG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 GWB"), {
      lawCode: "GWB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 KWG"), {
      lawCode: "KWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("§ 1 OWiG"), {
      lawCode: "OWIG",
      section: "1",
    });
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
    assert.deepEqual(parseLawReference("1 BDSG"), {
      lawCode: "BDSG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 UWG"), {
      lawCode: "UWG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 VVG"), {
      lawCode: "VVG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 AGG"), {
      lawCode: "AGG",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 GWB"), {
      lawCode: "GWB",
      section: "1",
    });
    assert.deepEqual(parseLawReference("1 KWG"), {
      lawCode: "KWG",
      section: "1",
    });
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
    assert.deepEqual(parseLawReference("1 OWiG"), {
      lawCode: "OWIG",
      section: "1",
    });
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
    assert.equal(parseLawReference("§ 1 EGBGB"), null);
    assert.equal(parseLawReference("EGBGB § 1"), null);
    assert.equal(parseLawReference("EGBGB 1"), null);
    assert.equal(parseLawReference("1 EGBGB"), null);
  });
});
