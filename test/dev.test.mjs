import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { fixture, runDev, tagsOf } from "./helpers.mjs";

const input = ["src/main.js", "src/entry.css"];

describe("dev server", () => {
  test("writes the HMR client and inputs pointing at the dev server", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    const { content, port } = await runDev(root, file, { templateFilePath: file, input });
    assert.deepEqual(tagsOf(content), [
      `<script type="module" src="http://127.0.0.1:${port}/@vite/client"></script>`,
      `<script type="module" src="http://127.0.0.1:${port}/src/main.js"></script>`,
      `<script type="module" src="http://127.0.0.1:${port}/src/entry.css"></script>`,
    ]);
  });

  test("prefers server.origin and includes Vite's base", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    const { content } = await runDev(
      root,
      file,
      { templateFilePath: file, input: [path.join(root, "src/main.js")], injectClient: false },
      { base: "/theme/", server: { origin: "https://shop.test:5173/" } }
    );
    assert.deepEqual(tagsOf(content), [
      `<script type="module" src="https://shop.test:5173/theme/src/main.js"></script>`,
    ]);
  });

  test("works in middleware mode when server.origin is set", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    const { content } = await runDev(
      root,
      file,
      { templateFilePath: file, input },
      { server: { middlewareMode: true, origin: "http://localhost:8080" } }
    );
    assert.match(tagsOf(content)[0], /src="http:\/\/localhost:8080\/@vite\/client"/);
  });

  test("serves inputs outside the root through /@fs/", async () => {
    const root = await fixture();
    const outside = path.join(await fixture(), "src/main.js");
    const file = path.join(root, "t.html");
    const { content, port } = await runDev(
      root,
      file,
      { templateFilePath: file, input: [outside], injectClient: false },
      { server: { fs: { strict: false } } }
    );
    assert.deepEqual(tagsOf(content), [
      `<script type="module" src="http://127.0.0.1:${port}/@fs${outside}"></script>`,
    ]);
  });

  test("escapes @ for Razor templates", async () => {
    const root = await fixture();
    const file = path.join(root, "_Vite.cshtml");
    const { content } = await runDev(root, file, { templateFilePath: file, input });
    assert.match(tagsOf(content)[0], /\/@@vite\/client"/);
  });

  test("adds custom attributes", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    const { content } = await runDev(root, file, {
      templateFilePath: file,
      input,
      attributes: { nonce: "@nonce" },
    });
    for (const tag of tagsOf(content)) assert.match(tag, / nonce="@nonce">/);
  });
});
