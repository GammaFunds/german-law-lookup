import { canonicalDisplayLawCode } from "./displayLawCode";
import type { LawProvider } from "./LawProvider";
import type { LawReference, LawSection } from "./types";

export interface LawSectionCache {
  get(reference: LawReference): Promise<LawSection | null>;
  set(section: LawSection): Promise<void>;
}

export interface LawSectionCacheStorage {
  load(): Promise<Record<string, LawSection> | null>;
  save(entries: Record<string, LawSection>): Promise<void>;
}

export interface CachedLawProviderOptions {
  allowedProviderIds: readonly string[];
  ttlDays?: number | null;
  now?: () => Date;
}

export function lawSectionCacheKey(reference: LawReference): string {
  return `${reference.lawCode.trim().toUpperCase()}:${reference.section.trim().toLowerCase()}`;
}

export class InMemoryLawSectionCache implements LawSectionCache {
  private readonly entries = new Map<string, LawSection>();

  async get(reference: LawReference): Promise<LawSection | null> {
    return cloneLawSection(this.entries.get(lawSectionCacheKey(reference)) ?? null);
  }

  async set(section: LawSection): Promise<void> {
    this.entries.set(lawSectionCacheKey(section), cloneLawSection(section));
  }
}

export class StoredLawSectionCache implements LawSectionCache {
  constructor(private readonly storage: LawSectionCacheStorage) {}

  async get(reference: LawReference): Promise<LawSection | null> {
    const entries = await this.storage.load();
    return cloneLawSection(entries?.[lawSectionCacheKey(reference)] ?? null);
  }

  async set(section: LawSection): Promise<void> {
    const entries = { ...((await this.storage.load()) ?? {}) };
    entries[lawSectionCacheKey(section)] = cloneLawSection(section);
    await this.storage.save(entries);
  }
}

export class CachedLawProvider implements LawProvider {
  readonly id = "cache";
  readonly label = "Local Law Section Cache";

  constructor(
    private readonly wrappedProvider: LawProvider,
    private readonly cache: LawSectionCache,
    private readonly options: CachedLawProviderOptions,
  ) {}

  async getSection(reference: LawReference): Promise<LawSection | null> {
    const liveSection = await this.wrappedProvider.getSection(reference);
    if (liveSection) {
      try {
        await this.cache.set(liveSection);
      } catch {
        // Cache writes are best-effort; a live provider result must remain usable.
      }

      return liveSection;
    }

    const cachedSection = await this.cache.get(reference);
    if (
      cachedSection &&
      this.isAllowedCachedProvider(cachedSection.providerId) &&
      this.isFreshCachedSection(cachedSection)
    ) {
      return {
        ...cachedSection,
        lawCode: canonicalDisplayLawCode(cachedSection.lawCode),
        cacheStatus: "cached",
      };
    }

    return null;
  }

  private isAllowedCachedProvider(providerId: string): boolean {
    return this.options.allowedProviderIds.includes(providerId);
  }

  private isFreshCachedSection(section: LawSection): boolean {
    if (this.options.ttlDays == null) {
      return true;
    }

    const retrievedAtMs = Date.parse(section.retrievedAt);
    if (!Number.isFinite(retrievedAtMs)) {
      return false;
    }

    const nowMs = (this.options.now ?? (() => new Date()))().getTime();
    const ttlMs = this.options.ttlDays * 24 * 60 * 60 * 1000;
    return nowMs - retrievedAtMs <= ttlMs;
  }
}

function cloneLawSection(section: LawSection): LawSection;
function cloneLawSection(section: LawSection | null): LawSection | null;
function cloneLawSection(section: LawSection | null): LawSection | null {
  return section ? { ...section } : null;
}
