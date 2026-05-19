export class LawProviderUnavailableError extends Error {
  constructor(
    readonly providerId: string,
    message: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "LawProviderUnavailableError";
  }
}

