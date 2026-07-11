export interface LawProviderHttpResponse {
  ok: boolean;
  status?: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type LawProviderHttpTransport = (
  input: string,
  options?: { headers?: Record<string, string> },
) => Promise<LawProviderHttpResponse>;

interface RequestUrlParamLike {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
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
  return async (url, options) => {
    const request = options?.headers
      ? {
          url,
          method: "GET",
          headers: options.headers,
          throw: false,
        }
      : {
          url,
          method: "GET",
          throw: false,
        };

    const response = await requestUrl(request);

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: async () => response.text,
      json: async () => response.json,
    };
  };
}

export function createObsidianRequestUrlPostTransport(
  requestUrl: RequestUrlLike,
): (url: string, body: string) => Promise<LawProviderHttpResponse> {
  return async (url, body) => {
    const response = await requestUrl({
      url,
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
      },
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
