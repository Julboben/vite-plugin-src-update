import { defineConfig } from "vite";
import { resolve } from "node:path";
import viteSrcUpdate from "./dist";

export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "localhost",
    },
    resolve: {},
    plugins: [
      viteSrcUpdate({
        scriptsInDev: ["@vite/client", "main.js", "test-src-update.js"],
        devServerAddress: "http://localhost:5173",
        templateFilePath: "index.html",
        entrypointsDir: "vite",
        cdn: true,
      }),
    ],
    build: {
      outDir: resolve(__dirname, "vite-build"),
      assetsDir: ".",
      sourcemap: true,
      manifest: "manifest.json",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "main.js"),
          jquery: resolve(__dirname, "jquery.js"),
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
