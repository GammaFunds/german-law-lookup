import type { LawReference } from "./types";

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

export class LawTranslationUnavailableError extends Error {
  constructor(readonly reference: LawReference) {
    super(`No verified English translation is configured for ${reference.lawCode}.`);
    this.name = "LawTranslationUnavailableError";
  }
}
