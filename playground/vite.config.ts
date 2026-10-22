import { copyFileSync, existsSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { defineConfig } from "vite";
import vitePluginSrcUpdate from "../src/index.js";

const root = import.meta.dirname;
const input = [
  "src/entrypoints/main.js",
  "src/entrypoints/second.js",
  "src/styles/entry.css",
];

// index.html is gitignored and created from index.shell.html, so the tags the
// plugin writes between its markers never show up as changes in git.
const indexHtml = resolve(root, "index.html");
if (!existsSync(indexHtml)) {
  copyFileSync(resolve(root, "index.shell.html"), indexHtml);
}

export default defineConfig({
  build: {
    outDir: "dist",
    // Flat output, as Shopify's `asset_url` filter requires.
    assetsDir: "",
    emptyOutDir: true,
    rolldownOptions: {
      input: Object.fromEntries(
        input.map((p) => [basename(p, extname(p)), resolve(root, p)])
      ),
    },
  },
  plugins: [
    vitePluginSrcUpdate([
      // Updates the tags between the markers in index.html.
      { templateFilePath: indexHtml, input, verbose: true },
      // Generated partials showing the output for each platform preset.
      {
        templateFilePath: resolve(root, "templates/vite-assets.liquid"),
        input,
        assetUrl: "shopify",
      },
      {
        templateFilePath: resolve(root, "templates/vite-assets.html"),
        input,
        assetUrl: "bigcommerce",
      },
      {
        templateFilePath: resolve(root, "templates/_ViteAssets.cshtml"),
        input,
        assetUrl: "razor",
      },
      {
        templateFilePath: resolve(root, "templates/ViteAssets.inc"),
        input,
        assetUrl: "webforms",
      },
    ]),
  ],
});
