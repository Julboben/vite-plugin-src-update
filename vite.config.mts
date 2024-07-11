import { defineConfig } from "vite";
import { resolve } from "node:path";
import vitePluginSrcUpdate from "./dist";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "localhost",
    },
    resolve: {
      alias: {
        "@": resolve("src"),
      },
    },
    plugins: [
      ...vitePluginSrcUpdate([
        {
          templateFilePath: "index.html",
          outDir: "vite-build",
          input: ["src/entrypoints/main.js", "src/entrypoints/main2.js"],
        },
        {
          templateFilePath: "site/index.html",
          outDir: "vite-build2",
          input: [
            "src/entrypoints2/main.js",
          ],
        },
      ]),
    ],
    build: {
      outDir: resolve(__dirname, "vite-build"),
      assetsDir: ".",
      manifest: "manifest.json",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/entrypoints/main.js"),
          second: resolve(__dirname, "src/entrypoints/main2.js"),
        },
        output: {
          entryFileNames: `[name].bundle.[hash].js`,
          chunkFileNames: `[name].chunk.[hash].js`,
          assetFileNames: `[name].min.[hash].[ext]`,
        },
      },
    },
  };
});
