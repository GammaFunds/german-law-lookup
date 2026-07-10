import type { LawProvider } from "./LawProvider";
import {
  CachedLawProvider,
  type LawSectionCache,
} from "./LawSectionCache";

export interface CachedProviderCompositionOptions {
  enableLawSectionCache: boolean;
  lawSectionCacheTtlDays: number | null;
  enableMockLawProvider?: boolean;
  now?: () => Date;
}

export function buildCachedLawProviders(
  providers: LawProvider[],
  cache: LawSectionCache,
  options: CachedProviderCompositionOptions,
): LawProvider[] {
  if (!options.enableLawSectionCache) {
    return providers;
  }

  return [
    new CachedLawProvider(
      createProviderChain(providers),
      cache,
      {
        allowedProviderIds: allowedCachedProviderIds(options.enableMockLawProvider === true),
        ttlDays: options.lawSectionCacheTtlDays,
        now: options.now,
      },
    ),
  ];
}

export function allowedCachedProviderIds(enableMockLawProvider: boolean): string[] {
  return enableMockLawProvider
    ? ["fedlex", "neuris", "gesetze-im-internet", "ris", "mock"]
    : ["fedlex", "neuris", "gesetze-im-internet", "ris"];
}

function createProviderChain(providers: LawProvider[]): LawProvider {
  return {
    id: "provider-chain",
    label: "Provider chain",
    async getSection(reference) {
      for (const provider of providers) {
        const section = await provider.getSection(reference);
        if (section) {
          return section;
        }
      }

      return null;
    },
  };
}
