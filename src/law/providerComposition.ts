import type { LawProvider } from "./LawProvider";
import type { LawProviderHttpTransport } from "./httpTransport";
import { GesetzeImInternetProvider } from "./providers/GesetzeImInternetProvider";
import { MockLawProvider } from "./providers/MockLawProvider";
import { NeurisLawProvider } from "./providers/NeurisLawProvider";
import { RisLawProvider } from "./providers/RisLawProvider";

export interface ProviderCompositionOptions {
  enableMockLawProvider?: boolean;
  httpTransport?: LawProviderHttpTransport;
}

export function buildLawProviders(options: ProviderCompositionOptions = {}): LawProvider[] {
  const httpTransport = options.httpTransport ?? createMissingHttpTransport();

  const providers: LawProvider[] = [
    new NeurisLawProvider(undefined, httpTransport),
    new GesetzeImInternetProvider(undefined, httpTransport),
    new RisLawProvider(undefined, httpTransport),
  ];

  if (options.enableMockLawProvider === true) {
    providers.push(new MockLawProvider());
  }

  return providers;
}

function createMissingHttpTransport(): LawProviderHttpTransport {
  return async () => {
    throw new Error("No HTTP transport configured");
  };
}
