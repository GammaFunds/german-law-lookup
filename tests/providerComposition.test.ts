import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { buildLawProviders } from "../src/law/providerComposition";

describe("provider composition", () => {
  it("registers only runtime providers by default", () => {
    const providers = buildLawProviders();

    assert.deepEqual(
      providers.map((provider) => provider.id),
      ["neuris", "gesetze-im-internet"],
    );
  });

  it("registers MockLawProvider only when explicitly enabled", () => {
    const providers = buildLawProviders({ enableMockLawProvider: true });

    assert.deepEqual(
      providers.map((provider) => provider.id),
      ["neuris", "gesetze-im-internet", "mock"],
    );
  });

  it("does not call the configured transport while composing providers", () => {
    let calls = 0;

    buildLawProviders({
      httpTransport: async () => {
        calls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => "",
        };
      },
    });

    assert.equal(calls, 0);
  });
});
