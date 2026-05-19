import type { LawProvider } from "./LawProvider";
import { GesetzeImInternetProvider } from "./providers/GesetzeImInternetProvider";
import { MockLawProvider } from "./providers/MockLawProvider";
import { NeurisLawProvider } from "./providers/NeurisLawProvider";

export interface ProviderCompositionOptions {
  enableMockLawProvider?: boolean;
}

export function buildLawProviders(options: ProviderCompositionOptions = {}): LawProvider[] {
  const providers: LawProvider[] = [
    new NeurisLawProvider(),
    new GesetzeImInternetProvider(),
  ];

  if (options.enableMockLawProvider === true) {
    providers.push(new MockLawProvider());
  }

  return providers;
}
