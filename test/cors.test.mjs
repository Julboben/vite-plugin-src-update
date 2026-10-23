import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { normalizeStore, shopifyCors } from "../dist/cors.js";
import { fixture, runDev } from "./helpers.mjs";

/** A fake `/meta.json` lookup that records which origins were checked. */
function fakeStores(stores) {
  const calls = [];
  const fetchStoreMeta = async (origin) => {
    calls.push(origin);
    if (stores[origin] instanceof Error) throw stores[origin];
    return stores[origin];
  };
  return { calls, fetchStoreMeta };
}

const allows = (cors, origin) =>
  new Promise((resolve) => cors.origin(origin, (_err, allowed) => resolve(allowed)));

const STORES = {
  "https://develop-sh.brand.com": { name: "Brand DEVELOP", myshopify_domain: "brand-develop.myshopify.com" },
  "https://brand.dk": { name: "Brand DEVELOP", myshopify_domain: "brand-develop.myshopify.com" },
  "https://test-sh.brand.com": { name: "Brand TEST", myshopify_domain: "brand-test.myshopify.com" },
  "https://brand-test.myshopify.com": { name: "Brand TEST", myshopify_domain: "brand-test.myshopify.com" },
  "https://www.brand.com": undefined, // not a Shopify storefront
  "https://down.brand.com": new Error("ETIMEDOUT"),
};

describe("Shopify preview CORS", () => {
  test("always allows localhost and Shopify CLI without a lookup", async () => {
    const { calls, fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({ store: "brand-develop", logger: () => undefined, fetchStoreMeta });
    assert.equal(await allows(cors, "http://127.0.0.1:9292"), true);
    assert.equal(await allows(cors, "http://localhost:3000"), true);
    assert.equal(calls.length, 0);
  });

  test("without a store: allows any Shopify storefront, including custom and market domains", async () => {
    const { calls, fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({ logger: () => undefined, fetchStoreMeta });
    assert.equal(await allows(cors, "https://any-shop.myshopify.com"), true);
    assert.equal(await allows(cors, "https://develop-sh.brand.com"), true);
    assert.equal(await allows(cors, "https://brand.dk"), true);
    assert.equal(await allows(cors, "https://test-sh.brand.com"), true);
    assert.equal(await allows(cors, "https://www.brand.com"), false);
    // *.myshopify.com is allowed by pattern, without a lookup.
    assert.ok(!calls.includes("https://any-shop.myshopify.com"));
  });

  test("with a store: only allows that store's domains", async () => {
    const { fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({
      store: "https://brand-develop.myshopify.com/",
      logger: () => undefined,
      fetchStoreMeta,
    });
    assert.equal(await allows(cors, "https://develop-sh.brand.com"), true);
    assert.equal(await allows(cors, "https://brand.dk"), true);
    assert.equal(await allows(cors, "https://test-sh.brand.com"), false);
    assert.equal(await allows(cors, "https://brand-test.myshopify.com"), false);
  });

  test("blocks non-HTTPS sites, failed lookups and requests without an Origin", async () => {
    const { calls, fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({ logger: () => undefined, fetchStoreMeta });
    assert.equal(await allows(cors, "http://develop-sh.brand.com"), false);
    assert.equal(await allows(cors, "https://down.brand.com"), false);
    assert.equal(await allows(cors, undefined), false);
    assert.deepEqual(calls, ["https://down.brand.com"]);
  });

  test("checks each domain once per session", async () => {
    const { calls, fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({ logger: () => undefined, fetchStoreMeta });
    await Promise.all([
      allows(cors, "https://develop-sh.brand.com"),
      allows(cors, "https://develop-sh.brand.com"),
    ]);
    await allows(cors, "https://develop-sh.brand.com");
    assert.deepEqual(calls, ["https://develop-sh.brand.com"]);
  });

  test("logs allowed and blocked domains", async () => {
    const messages = [];
    const logger = {
      info: (msg) => messages.push(msg),
      warn: (msg) => messages.push(msg),
    };
    const { fetchStoreMeta } = fakeStores(STORES);
    const cors = shopifyCors({ store: "brand-develop", logger: () => logger, fetchStoreMeta });
    await allows(cors, "https://brand.dk");
    await allows(cors, "https://test-sh.brand.com");
    assert.match(messages[0], /Allowing dev assets for https:\/\/brand\.dk \(Brand DEVELOP\)/);
    assert.match(messages[1], /Blocked .* it belongs to brand-test\.myshopify\.com, not brand-develop\.myshopify\.com/);
  });

  test("normalizes the store name", () => {
    for (const input of ["my-shop", "my-shop.myshopify.com", "https://My-Shop.myshopify.com/", " my-shop.myshopify.com/admin "]) {
      assert.equal(normalizeStore(input), "my-shop.myshopify.com");
    }
    assert.equal(normalizeStore(""), undefined);
  });

  test("the dev server answers with the platform's CORS rules", async () => {
    const root = await fixture();
    const file = path.join(root, "t.liquid");
    const { result } = await runDev(
      root,
      file,
      { templateFilePath: file, input: ["src/main.js"], platform: "shopify" },
      {},
      async (port) => {
        const headerFor = async (origin) =>
          (await fetch(`http://127.0.0.1:${port}/src/main.js`, { headers: { origin } }))
            .headers.get("access-control-allow-origin");
        return {
          cli: await headerFor("http://127.0.0.1:9292"),
          myshopify: await headerFor("https://my-shop.myshopify.com"),
          plainHttp: await headerFor("http://evil.example"),
        };
      }
    );
    assert.deepEqual(result, {
      cli: "http://127.0.0.1:9292",
      myshopify: "https://my-shop.myshopify.com",
      plainHttp: null,
    });
  });
});
