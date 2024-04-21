import { defineConfig } from "vite";
import { resolve } from "node:path";
import vitePluginSrcUpdate from "./dist";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "localhost",
    },
    resolve: {},
    plugins: [
      vitePluginSrcUpdate({
        templateFilePath: "index.html",
        cdn: false,
      }),
    ],
    build: {
      outDir: resolve(__dirname, "vite-build"),
      assetsDir: ".",
      manifest: "manifest.json",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/entrypoints/main.js"),
          second: resolve(__dirname, "src/entrypoints/main-second.js"),
        },
        output: {
          entryFileNames: `[name].bundle.[hash].js`,
          chunkFileNames: `[name].chunk.[hash].js`,
          assetFileNames: `[name].min.[hash].[ext]`,
        },
      },
      plugins: [],
    },
  };
});
