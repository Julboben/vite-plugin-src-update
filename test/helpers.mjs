import { rmSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build, createLogger, createServer } from "vite";
import srcUpdate from "../dist/index.js";

export const INPUT = ["src/main.js", "src/second.js", "src/entry.css"];

const FILES = {
  "src/main.js": `import "./main.css";\nimport { shared } from "./shared.js";\nconsole.log(shared());\n`,
  "src/second.js": `import { shared } from "./shared.js";\nconsole.log(shared(), 2);\n`,
  "src/shared.js": `export function shared() {\n  return document.title.toUpperCase();\n}\n`,
  "src/main.css": `body { color: red; }\n`,
  "src/entry.css": `.entry { color: blue; }\n`,
};

const roots = [];
process.on("exit", () => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Creates a throwaway Vite project (removed on exit) and returns its root. */
export async function fixture(files = {}) {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "src-update-"))
  );
  roots.push(root);
  for (const [name, content] of Object.entries({ ...FILES, ...files })) {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), content);
  }
  return root;
}

/** A Vite logger that records messages instead of printing them. */
function recordingLogger() {
  const messages = [];
  const logger = createLogger("silent");
  for (const level of ["info", "warn", "warnOnce", "error"]) {
    logger[level] = (msg) => {
      messages.push(`${level}: ${msg}`);
    };
  }
  return { logger, messages };
}

/** Runs a production build with the plugin and returns the logged messages. */
export async function runBuild(root, pluginOptions, viteConfig = {}) {
  const { logger, messages } = recordingLogger();
  const { build: buildConfig, ...rest } = viteConfig;
  await build({
    root,
    configFile: false,
    customLogger: logger,
    logLevel: "silent",
    ...rest,
    build: {
      outDir: "dist",
      rollupOptions: {
        input: Object.fromEntries(
          INPUT.map((p) => [path.basename(p, path.extname(p)), path.join(root, p)])
        ),
      },
      ...buildConfig,
    },
    plugins: [srcUpdate(pluginOptions)],
  });
  return messages;
}

/** Starts a dev server, waits for `file` to be written and returns its content. */
export async function runDev(root, file, pluginOptions, viteConfig = {}) {
  const { logger, messages } = recordingLogger();
  const server = await createServer({
    root,
    configFile: false,
    customLogger: logger,
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    ...viteConfig,
    server: { host: "127.0.0.1", port: 0, ...viteConfig.server },
    plugins: [srcUpdate(pluginOptions)],
  });
  try {
    if (server.httpServer) await server.listen();
    const address = server.httpServer?.address();
    return { content: await waitForFile(file), messages, port: address?.port };
  } finally {
    await server.close();
  }
}

async function waitForFile(file, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      return await fs.readFile(file, "utf8");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error(`${file} was not written within ${timeout}ms`);
}

/** Returns the generated `<script>` and `<link>` tags, trimmed. */
export const tagsOf = (content) =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^<(script|link)\b/.test(line));

export const read = (file) => fs.readFile(file, "utf8");
export const exists = (file) =>
  fs.access(file).then(() => true, () => false);
