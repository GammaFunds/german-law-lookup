import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { LawProvider } from "../src/law/LawProvider";
import {
  CachedLawProvider,
  InMemoryLawSectionCache,
  lawSectionCacheKey,
} from "../src/law/LawSectionCache";
import { buildCachedLawProviders } from "../src/law/cachedProviderComposition";
import { LawProviderUnavailableError } from "../src/law/errors";
import type { LawReference, LawSection } from "../src/law/types";

describe("lawSectionCacheKey", () => {
  it("normalizes law code for cache keys", () => {
    assert.equal(lawSectionCacheKey({ lawCode: "bgb", section: "823" }), "BGB:823");
  });

  it("normalizes letter suffix casing for cache keys", () => {
    assert.equal(lawSectionCacheKey({ lawCode: "BGB", section: "312G" }), "BGB:312g");
    assert.equal(lawSectionCacheKey({ lawCode: "BGB", section: "312g" }), "BGB:312g");
    assert.equal(lawSectionCacheKey({ lawCode: "BGB", section: "823a" }), "BGB:823a");
    assert.equal(lawSectionCacheKey({ lawCode: "BGB", section: "823A" }), "BGB:823a");
  });
});

describe("CachedLawProvider", () => {
  it("does not call provider or cache during construction", () => {
    let providerCalls = 0;
    let cacheCalls = 0;

    new CachedLawProvider(
      lawProvider(async () => {
        providerCalls += 1;
        return section();
      }),
      {
        async get() {
          cacheCalls += 1;
          return null;
        },
        async set() {
          cacheCalls += 1;
        },
      },
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    assert.equal(providerCalls, 0);
    assert.equal(cacheCalls, 0);
  });

  it("does not call provider or cache while composing cached providers", () => {
    let providerCalls = 0;
    let cacheCalls = 0;
    const providers = [
      lawProvider(async () => {
        providerCalls += 1;
        return section();
      }),
    ];

    buildCachedLawProviders(
      providers,
      {
        async get() {
          cacheCalls += 1;
          return null;
        },
        async set() {
          cacheCalls += 1;
        },
      },
      {
        enableLawSectionCache: true,
        lawSectionCacheTtlDays: null,
      },
    );

    assert.equal(providerCalls, 0);
    assert.equal(cacheCalls, 0);
  });

  it("bypasses CachedLawProvider composition when cache is disabled", () => {
    const providers = [lawProvider(async () => section())];
    const cache = new InMemoryLawSectionCache();

    const composedProviders = buildCachedLawProviders(
      providers,
      cache,
      {
        enableLawSectionCache: false,
        lawSectionCacheTtlDays: null,
      },
    );

    assert.deepEqual(composedProviders, providers);
  });

  it("calls provider on cache miss and stores successful result", async () => {
    const cache = new InMemoryLawSectionCache();
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return section();
      }),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.cacheStatus, "live");
    assert.deepEqual(await cache.get(reference()), section());
  });

  it("prefers live provider result over cached allowed result", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ text: "Cached provider text" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return section({ providerId: "neuris", text: "Live provider text" });
      }),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.providerId, "neuris");
    assert.equal(result?.cacheStatus, "live");
    assert.equal(result?.text, "Live provider text");
    assert.equal((await cache.get(reference()))?.providerId, "neuris");
  });

  it("returns cached neuris result when provider returns null and neuris is allowed", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ providerId: "neuris", providerLabel: "Rechtsinformationen des Bundes" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.providerId, "neuris");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("returns cached Gesetze im Internet result when provider returns null and Gesetze im Internet is allowed", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ providerId: "gesetze-im-internet" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.providerId, "gesetze-im-internet");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("canonicalizes pre-existing cached STGB display code on fallback", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({
      providerId: "gesetze-im-internet",
      sourceUrl: "https://www.gesetze-im-internet.de/stgb/__242.html",
      lawCode: "STGB",
      lawTitle: "Strafgesetzbuch",
      section: "242",
      heading: "Diebstahl",
      text: "Wer eine fremde bewegliche Sache wegnimmt.",
    }));
    const provider = new CachedLawProvider(
      lawProvider(async () => null),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet"],
      },
    );

    const result = await provider.getSection({ lawCode: "STGB", section: "242" });

    assert.equal(result?.lawCode, "StGB");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("does not return expired cached result after provider returns null", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ retrievedAt: "2026-05-18T00:00:00.000Z" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
        ttlDays: 1,
        now: () => new Date("2026-05-20T00:00:00.000Z"),
      },
    );

    assert.equal(await provider.getSection(reference()), null);
    assert.equal(calls, 1);
  });

  it("returns unexpired cached result after provider returns null", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ retrievedAt: "2026-05-19T12:00:00.000Z" }));
    const provider = new CachedLawProvider(
      lawProvider(async () => null),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
        ttlDays: 1,
        now: () => new Date("2026-05-20T00:00:00.000Z"),
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(result?.cacheStatus, "cached");
    assert.equal(result?.text, "Fixture text");
  });

  it("retrieves cached uppercase letter suffix with lowercase reference section", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ section: "312G" }));
    const provider = new CachedLawProvider(
      lawProvider(async () => null),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    const result = await provider.getSection({ lawCode: "BGB", section: "312g" });

    assert.equal(result?.section, "312G");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("retrieves cached lowercase letter suffix with uppercase reference section", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ section: "312g" }));
    const provider = new CachedLawProvider(
      lawProvider(async () => null),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    const result = await provider.getSection({ lawCode: "BGB", section: "312G" });

    assert.equal(result?.section, "312g");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("ignores cached mock result when provider returns null and mock is not allowed", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ providerId: "mock", providerLabel: "Mock Law Provider" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result, null);
  });

  it("returns cached mock result only when provider returns null and mock is explicitly allowed", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section({ providerId: "mock", providerLabel: "Mock Law Provider" }));
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["neuris", "gesetze-im-internet", "mock"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.providerId, "mock");
    assert.equal(result?.providerLabel, "Mock Law Provider");
    assert.equal(result?.cacheStatus, "cached");
  });

  it("returns live result when cache write fails", async () => {
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return section();
      }),
      {
        async get() {
          return null;
        },
        async set() {
          throw new Error("cache unavailable");
        },
      },
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    const result = await provider.getSection(reference());

    assert.equal(calls, 1);
    assert.equal(result?.cacheStatus, "live");
    assert.equal(result?.text, "Fixture text");
  });

  it("propagates provider failures without returning cached fallback", async () => {
    const cache = new InMemoryLawSectionCache();
    await cache.set(section());
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        throw new LawProviderUnavailableError("fixture", "provider unavailable");
      }),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    await assert.rejects(
      provider.getSection(reference()),
      LawProviderUnavailableError,
    );
    assert.deepEqual(await cache.get(reference()), section());
  });

  it("does not cache null results", async () => {
    const cache = new InMemoryLawSectionCache();
    let calls = 0;
    const provider = new CachedLawProvider(
      lawProvider(async () => {
        calls += 1;
        return null;
      }),
      cache,
      {
        allowedProviderIds: ["gesetze-im-internet"],
      },
    );

    assert.equal(await provider.getSection(reference()), null);
    assert.equal(await cache.get(reference()), null);
    assert.equal(calls, 1);
  });
});

function lawProvider(getSection: LawProvider["getSection"]): LawProvider {
  return {
    id: "fixture",
    label: "Fixture Provider",
    getSection,
  };
}

function reference(): LawReference {
  return {
    lawCode: "BGB",
    section: "823",
  };
}

function section(overrides: Partial<LawSection> = {}): LawSection {
  return {
    providerId: "gesetze-im-internet",
    providerLabel: "Gesetze im Internet",
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__823.html",
    lawCode: "BGB",
    lawTitle: "Bürgerliches Gesetzbuch",
    section: "823",
    heading: "Schadensersatzpflicht",
    text: "Fixture text",
    retrievedAt: "2026-05-20T00:00:00.000Z",
    cacheStatus: "live",
    isOfficialSource: true,
    isAuthoritativeText: false,
    ...overrides,
  };
}
