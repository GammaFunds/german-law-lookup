export interface LawProviderHttpResponse {
  ok: boolean;
  status?: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type LawProviderHttpTransport = (input: string) => Promise<LawProviderHttpResponse>;

export function createFetchLawProviderTransport(
  fetchFn: (input: string) => Promise<LawProviderHttpResponse> = (input) => fetch(input),
): LawProviderHttpTransport {
  return fetchFn;
}

interface RequestUrlParamLike {
  url: string;
  method?: string;
  throw?: boolean;
}

interface RequestUrlResponseLike {
  status: number;
  text: string;
  json: unknown;
}

export type RequestUrlLike = (
  request: RequestUrlParamLike | string,
) => Promise<RequestUrlResponseLike>;

export function createObsidianRequestUrlTransport(
  requestUrl: RequestUrlLike,
): LawProviderHttpTransport {
  return async (url) => {
    const response = await requestUrl({
      url,
      method: "GET",
      throw: false,
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => response.text,
      json: async () => response.json,
    };
  };
}
