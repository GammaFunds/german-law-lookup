import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  enrichJurisdiction,
  parseLawReference,
  parseLawReferenceWithSelectedJurisdiction,
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
});
