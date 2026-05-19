import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { LookupSequence } from "../src/ui/LookupSequence";

describe("LookupSequence", () => {
  it("marks earlier lookup ids stale after a newer lookup starts", () => {
    const sequence = new LookupSequence();

    const first = sequence.next();
    const second = sequence.next();

    assert.equal(sequence.isCurrent(first), false);
    assert.equal(sequence.isCurrent(second), true);
  });
});
