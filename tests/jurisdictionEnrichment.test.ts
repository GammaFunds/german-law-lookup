import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  enrichJurisdiction,
  parseLawReference,
  parseLawReferenceWithSelectedJurisdiction,
  type ParsedLawReference,
} from "../src/parser";

describe("jurisdiction enrichment", () => {
  it("keeps Deutschland selection DE/default-compatible for bare StGB", () => {
    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("StGB § 75", "DE"),
      {
        lawCode: "STGB",
        section: "75",
      },
    );
  });

  it("adds AT when Österreich is selected and no jurisdiction is explicit", () => {
    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("StGB § 75", "AT"),
      {
        lawCode: "STGB",
        section: "75",
        jurisdiction: "AT",
      },
    );
  });

  it("adds AT for ABGB when Österreich is selected", () => {
    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("ABGB § 1295", "AT"),
      {
        lawCode: "ABGB",
        section: "1295",
        jurisdiction: "AT",
      },
    );
  });

  it("parses B-VG article references when Österreich is selected", () => {
    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("B-VG Art. 144", "AT"),
      {
        lawCode: "B-VG",
        section: "144",
        referenceType: "article",
        jurisdiction: "AT",
      },
    );
  });

  it("preserves explicit AT jurisdiction regardless of dropdown selection", () => {
    const parsed = parseLawReference("AT StGB § 75");
    assert.notEqual(parsed, null);

    assert.deepEqual(enrichJurisdiction(parsed!, "DE"), {
      lawCode: "STGB",
      section: "75",
      jurisdiction: "AT",
    });

    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("AT StGB § 75", "DE"),
      {
        lawCode: "STGB",
        section: "75",
        jurisdiction: "AT",
      },
    );
  });

  it("does not add jurisdiction for bare StGB when Deutschland is selected", () => {
    assert.deepEqual(
      parseLawReferenceWithSelectedJurisdiction("StGB § 242", "DE"),
      {
        lawCode: "STGB",
        section: "242",
      },
    );
  });

  it("preserves explicit DE jurisdiction when CH or AT is selected", () => {
    const reference: ParsedLawReference = {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
      jurisdiction: "DE",
    };

    assert.deepEqual(enrichJurisdiction(reference, "CH"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
      jurisdiction: "DE",
    });

    assert.deepEqual(enrichJurisdiction(reference, "AT"), {
      lawCode: "GG",
      section: "1",
      referenceType: "article",
      jurisdiction: "DE",
    });
  });

  describe("CH jurisdiction", () => {
    it("parses Art. 8 BV when Switzerland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("Art. 8 BV", "CH"),
        {
          lawCode: "BV",
          section: "8",
          referenceType: "article",
          jurisdiction: "CH",
        },
      );
    });

    it("parses BV Art. 8 when Switzerland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("BV Art. 8", "CH"),
        {
          lawCode: "BV",
          section: "8",
          referenceType: "article",
          jurisdiction: "CH",
        },
      );
    });

    it("parses Artikel 41 BV when Switzerland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("Artikel 41 BV", "CH"),
        {
          lawCode: "BV",
          section: "41",
          referenceType: "article",
          jurisdiction: "CH",
        },
      );
    });

    it("parses Art. 1 ZGB when Switzerland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("Art. 1 ZGB", "CH"),
        {
          lawCode: "ZGB",
          section: "1",
          referenceType: "article",
          jurisdiction: "CH",
        },
      );
    });

    it("parses ZGB Art. 1 when Switzerland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("ZGB Art. 1", "CH"),
        {
          lawCode: "ZGB",
          section: "1",
          referenceType: "article",
          jurisdiction: "CH",
        },
      );
    });

    it("rejects StGB § 75 when Switzerland is selected", () => {
      assert.equal(
        parseLawReferenceWithSelectedJurisdiction("StGB § 75", "CH"),
        null,
      );
    });

    it("rejects Art. 1 GG when Switzerland is selected", () => {
      assert.equal(
        parseLawReferenceWithSelectedJurisdiction("Art. 1 GG", "CH"),
        null,
      );
    });

    it("rejects § 8 BV when Switzerland is selected", () => {
      assert.equal(
        parseLawReferenceWithSelectedJurisdiction("§ 8 BV", "CH"),
        null,
      );
    });

    it("rejects OR Art. 1 when Switzerland is selected", () => {
      assert.equal(
        parseLawReferenceWithSelectedJurisdiction("OR Art. 1", "CH"),
        null,
      );
    });

    it("preserves DE/default behavior for StGB § 75 when Deutschland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("StGB § 75", "DE"),
        {
          lawCode: "STGB",
          section: "75",
        },
      );
    });

    it("preserves DE/default behavior for Art. 1 GG when Deutschland is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("Art. 1 GG", "DE"),
        {
          lawCode: "GG",
          section: "1",
          referenceType: "article",
        },
      );
    });

    it("preserves AT behavior for B-VG Art. 144 when Österreich is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("B-VG Art. 144", "AT"),
        {
          lawCode: "B-VG",
          section: "144",
          referenceType: "article",
          jurisdiction: "AT",
        },
      );
    });

    it("preserves explicit AT jurisdiction when another dropdown value is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("AT StGB § 75", "CH"),
        {
          lawCode: "STGB",
          section: "75",
          jurisdiction: "AT",
        },
      );
    });

    it("preserves explicit AT jurisdiction when DE is selected", () => {
      assert.deepEqual(
        parseLawReferenceWithSelectedJurisdiction("AT StGB § 75", "DE"),
        {
          lawCode: "STGB",
          section: "75",
          jurisdiction: "AT",
        },
      );
    });
  });
});
