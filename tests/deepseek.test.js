import assert from "node:assert/strict";
import { test } from "node:test";

import { queryDeepSeekUsage } from "../dist/plugin/lib/deepseek.js";

test("queries and formats DeepSeek balance", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        is_available: true,
        balance_infos: [
          {
            currency: "USD",
            total_balance: "12.34",
            granted_balance: "2.34",
            topped_up_balance: "10.00",
          },
        ],
      }),
    };
  };

  try {
    const result = await queryDeepSeekUsage({ type: "key", key: "sk-secret" });
    assert.equal(result.success, true);
    assert.match(result.output, /12\.34 USD/);
    assert.match(result.output, /Granted balance: 2\.34 USD/);
    assert.match(result.output, /Topped-up balance: 10\.00 USD/);
    assert.equal(request.url, "https://api.deepseek.com/user/balance");
    assert.equal(request.options.headers.Authorization, "Bearer sk-secret");
    assert.doesNotMatch(result.output, /sk-secret/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
