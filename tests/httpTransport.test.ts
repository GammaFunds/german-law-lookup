import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createObsidianRequestUrlTransport, type RequestUrlLike } from "../src/law/httpTransport";

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
});
