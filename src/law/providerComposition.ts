import type { LawProvider } from "./LawProvider";
import type { LawProviderHttpTransport } from "./httpTransport";
import { GesetzeImInternetProvider } from "./providers/GesetzeImInternetProvider";
import { MockLawProvider } from "./providers/MockLawProvider";
import { NeurisLawProvider } from "./providers/NeurisLawProvider";

export interface ProviderCompositionOptions {
  enableMockLawProvider?: boolean;
  httpTransport?: LawProviderHttpTransport;
}

export function buildLawProviders(options: ProviderCompositionOptions = {}): LawProvider[] {
  const providers: LawProvider[] = [
    new NeurisLawProvider(undefined, options.httpTransport),
    new GesetzeImInternetProvider(undefined, options.httpTransport),
  ];

  if (options.enableMockLawProvider === true) {
    providers.push(new MockLawProvider());
  }

  return providers;
}
