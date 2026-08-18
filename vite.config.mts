import { defineConfig } from "vite";
import { resolve } from "node:path";
import vitePluginSrcUpdate from "./dist/index.js";

export default defineConfig(() => {
  return {
    server: {
      host: "localhost",
    },
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
      },
    },
    build: {
      outDir: resolve(import.meta.dirname, "vite-build"),
      assetsDir: ".",
      manifest: "manifest.json",
      emptyOutDir: true,
      rolldownOptions: {
        input: {
          // In this example main will be [name] in the template file when build.
          main: resolve(import.meta.dirname, "src/entrypoints/main.js"),
          test: resolve(import.meta.dirname, "src/entrypoints/test.js"),
          cssJoker: resolve(import.meta.dirname, "src/styles/css-joker.css"),
        },
        output: {
          entryFileNames: `[name].bundle.[hash].js`,
          chunkFileNames: `[name].chunk.[hash].js`,
          assetFileNames: `[name].min.[hash].[ext]`,
        },
      },
    },
    plugins: [
      vitePluginSrcUpdate({
        // Required - The path to the template file.
        templateFilePath: "index.html",
        // If you don't specify outDir, it will use the build.outDir.
        outDir: "vite-build",
        // If you don't specify input, it will use the rolldownOptions input.
        input: [
          "src/entrypoints/main.js",
          "src/entrypoints/test.js",
          "src/styles/css-joker.css",
        ],
      }),
    ],
  };
});
