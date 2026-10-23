import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "vite";
import type { Logger, Plugin, ResolvedConfig, ViteDevServer } from "vite";
import {
  collectBuildTags,
  type BuildInput,
  type BundleFile,
} from "./build.js";
import {
  checkOptions,
  defaultsPlugin,
  NAME,
  PREFIX,
  resolvePlatform,
} from "./config.js";
import { onDevOrigin } from "./dev.js";
import { expandInputs } from "./inputs.js";
import type { VitePluginSrcUpdateOptions } from "./options.js";
import { encodeFileName, moduleScript, renderTag } from "./tags.js";
import { getTemplateFormat, writeTemplate } from "./template.js";

export type {
  AssetUrlFunction,
  AssetUrlPreset,
  Platform,
  VitePluginSrcUpdateOptions,
} from "./options.js";
export { DEFAULT_COMMENT_TEMPLATES } from "./template.js";

export default function vitePluginSrcUpdate(
  options: VitePluginSrcUpdateOptions | VitePluginSrcUpdateOptions[]
): Plugin[] {
  const list = Array.isArray(options) ? options : [options];
  return [defaultsPlugin(list), ...list.map(createPlugin)];
}

export { vitePluginSrcUpdate };

function createPlugin(options: VitePluginSrcUpdateOptions): Plugin {
  const {
    templateFilePath,
    input = [],
    base,
    outDir,
    attributes = {},
    integrity = false,
    modulePreload,
    injectClient = true,
    devTags = [],
    marker = NAME,
    force = false,
    verbose = false,
    dryRun = false,
    commentTemplates,
  } = options;
  if (!templateFilePath) {
    throw new Error(`${PREFIX} The "templateFilePath" option is required.`);
  }

  const filePath = path.resolve(templateFilePath);
  const fileLabel = path.relative(process.cwd(), filePath) || filePath;
  const format = getTemplateFormat(filePath, commentTemplates);
  const { platform, wrapUrl } = resolvePlatform(options);
  const warnings = checkOptions(options);

  let config: ResolvedConfig;
  let logger: Logger;
  let userSetBase = false;
  let assetBase = "";
  // Collected across `writeBundle` calls, since plugins like
  // @vitejs/plugin-legacy write several outputs per build.
  let files = new Map<string, BundleFile>();

  const info = (msg: string) =>
    logger.info(`${PREFIX} ${msg}`, { timestamp: true });
  const debug = (msg: string) => verbose && info(msg);
  const warn = (msg: string) =>
    logger.warn(`${PREFIX} ${msg}`, { timestamp: true });

  function getInputs(): { absolute: string; relative: string }[] {
    let inputs = input.length
      ? input
      : // `rolldownOptions` is Vite 8+, `rollupOptions` covers Vite 5–7.
        ((config.build as { rolldownOptions?: { input?: unknown } })
          .rolldownOptions?.input ?? config.build.rollupOptions?.input);
    if (!inputs) inputs = [];
    if (typeof inputs === "string") inputs = [inputs];
    if (!Array.isArray(inputs)) inputs = Object.values(inputs);

    return expandInputs(inputs as string[], config.root).map((absolute) => ({
      absolute,
      relative: normalizePath(path.relative(config.root, absolute)),
    }));
  }

  function resolveBase(): string {
    if (base !== undefined) return withTrailingSlash(base);
    if (outDir !== undefined) {
      return withTrailingSlash(normalizePath(outDir));
    }
    if (userSetBase && !isRelativeBase(config.base)) return config.base;

    const relative = normalizePath(
      path.relative(config.root, path.resolve(config.root, config.build.outDir))
    );
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      warn(
        `build.outDir is outside the Vite root, so the public URL of built ` +
          `assets can't be inferred. Set the "base" option (e.g. "/dist/").`
      );
      return isRelativeBase(config.base) ? "/" : config.base;
    }
    return relative ? `/${relative}/` : "/";
  }

  async function update(rendered: string[]): Promise<void> {
    if (dryRun) {
      info(`[dry run] ${fileLabel} would contain:\n${rendered.join("\n")}`);
      return;
    }
    const result = await writeTemplate({
      filePath,
      header: format.header,
      tags: rendered,
      marker,
      force,
    });
    debug(`${fileLabel} ${result}`);
  }

  function writeDevTemplate(server: ViteDevServer, origin: string) {
    const devBase = withTrailingSlash(server.config.base || "/");
    const url = (p: string) => format.escape(`${origin}${devBase}${p}`);

    const client = injectClient
      ? [renderTag(moduleScript(url("@vite/client"), attributes))]
      : [];
    const extra = typeof devTags === "function" ? devTags(origin) : devTags;
    const entries = getInputs().map(({ absolute, relative }) => {
      // Vite serves files outside the root from /@fs/<absolute path>.
      const urlPath = relative.startsWith("..")
        ? `@fs/${normalizePath(absolute).replace(/^\//, "")}`
        : relative;
      return renderTag(moduleScript(url(urlPath), attributes));
    });

    update([...client, ...extra, ...entries]).catch((err) =>
      logger.error(`${PREFIX} Failed to update ${fileLabel}: ${err.message}`, {
        error: err,
      })
    );
  }

  return {
    name: NAME,

    config(userConfig) {
      userSetBase = userConfig.base !== undefined;
    },

    configResolved(resolved) {
      config = resolved;
      logger = resolved.logger;
      warnings.forEach(warn);
      if (config.command === "build") {
        assetBase = resolveBase();
        if (platform === "shopify" && config.build.assetsDir) {
          warn(
            `Shopify serves theme assets from a flat folder. Set build.assetsDir ` +
              `to "" so the asset_url filter can find "${config.build.assetsDir}/…" files.`
          );
        }
      }
      debug(`${config.command} mode, template: ${fileLabel}`);
    },

    configureServer(server) {
      onDevOrigin(server, (origin) => {
        if (origin) writeDevTemplate(server, origin);
        else
          warn(
            `The dev server origin is unknown in middleware mode. ` +
              `Set server.origin to update ${fileLabel}.`
          );
      });
    },

    buildEnd(error) {
      // Rolldown runs buildStart/buildEnd once per output, so only reset on
      // failure; closeBundle resets after a successful build.
      if (error) files = new Map();
    },

    writeBundle(_options, bundle) {
      // Skip SSR builds and non-client environments (Vite 6+ Environment API).
      const { environment } = this as {
        environment?: { config: { consumer: string } };
      };
      const isClient = environment
        ? environment.config.consumer === "client"
        : !config.build.ssr;
      if (!isClient) return;
      for (const file of Object.values(bundle)) {
        files.set(file.fileName, file as BundleFile);
      }
    },

    async closeBundle() {
      if (config.command !== "build" || !files.size) return;

      const inputs = getInputs().map(
        ({ absolute, relative }): BuildInput => ({
          // Chunk ids are real paths (e.g. /private/var/… on macOS).
          id: normalizePath(realpath(absolute)),
          relative,
        })
      );

      const { tags, unmatched } = collectBuildTags({
        files,
        inputs,
        url: (fileName) => {
          const encoded = encodeFileName(fileName);
          const url = assetBase + encoded;
          return wrapUrl ? wrapUrl(url, encoded) : format.escape(url);
        },
        modulePreload: modulePreload ?? config.build.modulePreload !== false,
        integrity,
        attributes,
      });
      files = new Map();

      for (const name of unmatched) {
        warn(`Input "${name}" was not found in the build output.`);
      }

      try {
        await update(tags.map(renderTag));
      } catch (err) {
        this.error(`Failed to update ${fileLabel}: ${(err as Error).message}`);
      }
    },
  };
}

const withTrailingSlash = (value: string) =>
  value === "" || value.endsWith("/") ? value : `${value}/`;

const isRelativeBase = (value: string) => value === "" || value.startsWith(".");

function realpath(file: string): string {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}
