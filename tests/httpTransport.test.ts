import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createObsidianRequestUrlPostTransport, createObsidianRequestUrlTransport, type RequestUrlLike } from "../src/law/httpTransport";

describe("createObsidianRequestUrlTransport", () => {
  it("adapts requestUrl responses to the provider HTTP shape", async () => {
    const calls: unknown[] = [];
    const requestUrl: RequestUrlLike = async (request) => {
      calls.push(request);
      return {
        status: 200,
        text: "<html>fixture</html>",
        json: { ok: true },
      };
    };

    const transport = createObsidianRequestUrlTransport(requestUrl);
    const response = await transport("https://www.gesetze-im-internet.de/bgb/__823.html");

    assert.equal(response.ok, true);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<html>fixture</html>");
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(calls, [
      {
        url: "https://www.gesetze-im-internet.de/bgb/__823.html",
        method: "GET",
        throw: false,
      },
    ]);
  });

  it("keeps non-2xx statuses inspectable instead of throwing by default", async () => {
    const requestUrl: RequestUrlLike = async () => ({
      status: 404,
      text: "not found",
      json: { error: "not found" },
    });

    const response = await createObsidianRequestUrlTransport(requestUrl)(
      "https://www.gesetze-im-internet.de/bgb/__99999.html",
    );

    assert.equal(response.ok, false);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "not found");
  });

  it("forwards optional GET headers exactly", async () => {
    const calls: unknown[] = [];
    const requestUrl: RequestUrlLike = async (request) => {
      calls.push(request);
      return {
        status: 200,
        text: "ok",
        json: {},
      };
    };

    const transport = createObsidianRequestUrlTransport(requestUrl);
    await transport("https://publications.europa.eu/resource/celex/32016R0679", {
      headers: {
        Accept: "application/xhtml+xml",
        "Accept-Language": "deu",
        "Accept-Max-Cs-Size": "8388608",
      },
    });

    assert.deepEqual(calls, [
      {
        url: "https://publications.europa.eu/resource/celex/32016R0679",
        method: "GET",
        headers: {
          Accept: "application/xhtml+xml",
          "Accept-Language": "deu",
          "Accept-Max-Cs-Size": "8388608",
        },
        throw: false,
      },
    ]);
  });
});

describe("createObsidianRequestUrlPostTransport", () => {
  it("sends POST request with JSON Content-Type and unchanged body", async () => {
    const calls: unknown[] = [];
    const requestUrl: RequestUrlLike = async (request) => {
      calls.push(request);
      return {
        status: 200,
        text: '{"ok":true}',
        json: { ok: true },
      };
    };

    const transport = createObsidianRequestUrlPostTransport(requestUrl);
    const body = JSON.stringify({ query: { match_all: {} } });
    const response = await transport("https://example.com/search", body);

    assert.equal(response.ok, true);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '{"ok":true}');
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(calls, [
      {
        url: "https://example.com/search",
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        throw: false,
      },
    ]);
  });

  it("does not JSON.stringify the body again", async () => {
    let capturedBody: string | undefined;
    const requestUrl: RequestUrlLike = async (request) => {
      capturedBody = typeof request !== 'string' ? request.body : undefined;
      return { status: 200, text: "", json: {} };
    };

    const transport = createObsidianRequestUrlPostTransport(requestUrl);
    const original = '{"query":{"term":{"id":"test"}}}';
    await transport("https://example.com/search", original);

    assert.equal(capturedBody, original);
  });

  it("preserves non-2xx status on POST", async () => {
    const requestUrl: RequestUrlLike = async () => ({
      status: 404,
      text: "not found",
      json: {},
    });

    const transport = createObsidianRequestUrlPostTransport(requestUrl);
    const response = await transport("https://example.com/search", "{}");

    assert.equal(response.ok, false);
    assert.equal(response.status, 404);
  });

  it("existing GET transport tuple remains unchanged", async () => {
    const calls: unknown[] = [];
    const requestUrl: RequestUrlLike = async (request) => {
      calls.push(request);
      return { status: 200, text: "ok", json: {} };
    };

    const transport = createObsidianRequestUrlTransport(requestUrl);
    await transport("https://example.com/resource");

    assert.deepEqual(calls, [
      {
        url: "https://example.com/resource",
        method: "GET",
        throw: false,
      },
    ]);
  });
});
