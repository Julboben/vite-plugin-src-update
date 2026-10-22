import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";
import { configProbe, fixture, read, runBuild, runDev, tagsOf } from "./helpers.mjs";

const ENTRYPOINTS = {
  "src/entrypoints/app.ts": `import { shared } from "../shared.js";\nconsole.log(shared());\n`,
  "src/entrypoints/styles/theme.css": `body { margin: 0; }\n`,
  "src/entrypoints/nested/extra.js": `console.log("extra");\n`,
  "src/entrypoints/types.d.ts": `declare const x: string;\n`,
  "src/entrypoints/README.md": `not an entry\n`,
};

// Lets the plugin set the build input itself.
const NO_BUILD_INPUT = { build: { rollupOptions: {} } };

describe("input directories", () => {
  test("a directory includes every script and style file and becomes the build input", async () => {
    const root = await fixture(ENTRYPOINTS);
    const file = path.join(root, "t.html");
    await runBuild(root, { templateFilePath: file, input: ["src/entrypoints"] }, NO_BUILD_INPUT);

    assert.deepEqual(
      tagsOf(await read(file)).map((tag) => tag.replace(/-[\w-]{8}\./, ".")),
      [
        `<link rel="stylesheet" href="/dist/assets/theme.css">`,
        `<script type="module" src="/dist/assets/app.js"></script>`,
        `<script type="module" src="/dist/assets/extra.js"></script>`,
      ]
    );
  });

  test("combines the inputs of all templates into the build input", async () => {
    const root = await fixture(ENTRYPOINTS);
    const scripts = path.join(root, "scripts.html");
    const styles = path.join(root, "styles.html");
    await runBuild(
      root,
      [
        { templateFilePath: scripts, input: ["src/entrypoints/app.ts"] },
        { templateFilePath: styles, input: ["src/entrypoints/styles"] },
      ],
      NO_BUILD_INPUT
    );
    assert.match(tagsOf(await read(scripts)).join(), /^<script type="module" src="\/dist\/assets\/app-/);
    assert.match(tagsOf(await read(styles)).join(), /^<link rel="stylesheet" href="\/dist\/assets\/theme-/);
  });

  test("leaves a configured build input alone and filters by the directory", async () => {
    const root = await fixture(ENTRYPOINTS);
    const file = path.join(root, "t.html");
    const messages = await runBuild(root, { templateFilePath: file, input: ["src/entrypoints"] });
    // The fixture's own build input doesn't include the entrypoints directory.
    assert.equal(tagsOf(await read(file)).length, 0);
    assert.ok(messages.some((m) => m.includes(`"src/entrypoints/app.ts" was not found`)));
  });

  test("dev writes a tag per file in the directory", async () => {
    const root = await fixture(ENTRYPOINTS);
    const file = path.join(root, "t.html");
    const { content, port } = await runDev(root, file, {
      templateFilePath: file,
      input: ["src/entrypoints"],
      injectClient: false,
    });
    const origin = `http://127.0.0.1:${port}`;
    assert.deepEqual(tagsOf(content), [
      `<script type="module" src="${origin}/src/entrypoints/app.ts"></script>`,
      `<script type="module" src="${origin}/src/entrypoints/nested/extra.js"></script>`,
      `<script type="module" src="${origin}/src/entrypoints/styles/theme.css"></script>`,
    ]);
  });
});

describe("platform defaults", () => {
  const resolved = async (pluginOptions, viteConfig = {}) => {
    const root = await fixture();
    const probe = configProbe();
    await runBuild(
      root,
      { templateFilePath: path.join(root, "t.html"), ...pluginOptions },
      { ...viteConfig, plugins: [probe] }
    );
    return probe.config;
  };

  test("shopify: relative base, flat assets and CORS for myshopify.com previews", async () => {
    const config = await resolved({ platform: "shopify" });
    assert.equal(config.base, "./");
    assert.equal(config.build.assetsDir, "");
    const allowed = (origin) => config.server.cors.origin.some((re) => re.test(origin));
    assert.ok(allowed("https://my-store.myshopify.com"));
    assert.ok(allowed("http://127.0.0.1:9292"));
    assert.ok(!allowed("https://evil.example"));
    assert.ok(!allowed("https://my-store.myshopify.com.evil.example"));
  });

  test("bigcommerce: relative base only", async () => {
    const config = await resolved({ platform: "bigcommerce" });
    assert.equal(config.base, "./");
    assert.equal(config.build.assetsDir, "assets");
  });

  test("other presets keep Vite's defaults", async () => {
    const config = await resolved({ platform: "razor" });
    assert.equal(config.base, "/");
    assert.equal(config.build.assetsDir, "assets");
  });

  test("your own settings win", async () => {
    const config = await resolved(
      { platform: "shopify" },
      { base: "/theme/", server: { cors: false }, build: { assetsDir: "js" } }
    );
    assert.equal(config.base, "/theme/");
    assert.equal(config.build.assetsDir, "js");
    assert.equal(config.server.cors, false);
  });
});

describe("devTags", () => {
  test("are written after the HMR client and before the entries", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    const { content, port } = await runDev(root, file, {
      templateFilePath: file,
      input: ["src/main.js"],
      devTags: (origin) => [`<script src="${origin}/extra.js"></script>`, `<meta name="dev">`],
    });
    const origin = `http://127.0.0.1:${port}`;
    assert.deepEqual(
      content.split("\n").filter((line) => line.startsWith("<") && !line.startsWith("<!--")),
      [
        `<script type="module" src="${origin}/@vite/client"></script>`,
        `<script src="${origin}/extra.js"></script>`,
        `<meta name="dev">`,
        `<script type="module" src="${origin}/src/main.js"></script>`,
      ]
    );
  });

  test("are not written in builds", async () => {
    const root = await fixture();
    const file = path.join(root, "t.html");
    await runBuild(root, { templateFilePath: file, devTags: ["<meta name=dev>"] });
    assert.ok(!(await read(file)).includes("meta"));
  });
});
