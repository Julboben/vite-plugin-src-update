import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import vitePluginSrcUpdate from "../src/index.js";

const root = import.meta.dirname;
// Every file in src/entrypoints is an entry; the plugin also makes these the
// build input, so no build.rolldownOptions.input is needed.
const input = ["src/entrypoints", "src/styles/entry.css"];

// index.html is gitignored and created from index.shell.html, so the tags the
// plugin writes between its markers never show up as changes in git.
const indexHtml = resolve(root, "index.html");
if (!existsSync(indexHtml)) {
  copyFileSync(resolve(root, "index.shell.html"), indexHtml);
}

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    vitePluginSrcUpdate([
      // Updates the tags between the markers in index.html.
      { templateFilePath: indexHtml, input, verbose: true },
      // Generated partials showing the output for each platform.
      // The shopify platform also makes the build output flat (assetsDir: "").
      {
        templateFilePath: resolve(root, "templates/vite-assets.liquid"),
        input,
        platform: "shopify",
      },
      {
        templateFilePath: resolve(root, "templates/vite-assets.html"),
        input,
        platform: "bigcommerce",
      },
      {
        templateFilePath: resolve(root, "templates/_ViteAssets.cshtml"),
        input,
        platform: "razor",
      },
      {
        templateFilePath: resolve(root, "templates/ViteAssets.inc"),
        input,
        platform: "webforms",
      },
    ]),
  ],
});
