import path from "node:path";
import { version, type Logger, type Plugin, type UserConfig } from "vite";
import { shopifyCors } from "./cors.js";
import { onDevOrigin, ORIGIN_PLACEHOLDER } from "./dev.js";
import { expandInputs } from "./inputs.js";
import type {
  AssetUrlFunction,
  Platform,
  VitePluginSrcUpdateOptions,
} from "./options.js";
import { PLATFORM_URLS } from "./tags.js";

export const NAME = "vite-plugin-src-update";
export const PREFIX = `[${NAME}]`;

/** Platforms whose assets are served from a CDN rather than the site itself. */
const CDN_PLATFORMS = new Set<Platform>(["bigcommerce", "shopify"]);

// Typed as a Record so TypeScript flags any option missing from this list.
const OPTION_KEYS: Record<keyof VitePluginSrcUpdateOptions, true> = {
  templateFilePath: true,
  input: true,
  platform: true,
  base: true,
  assetUrl: true,
  attributes: true,
  integrity: true,
  modulePreload: true,
  injectClient: true,
  devTags: true,
  marker: true,
  force: true,
  commentTemplates: true,
  dryRun: true,
  verbose: true,
  outDir: true,
  cdn: true,
};

export interface ResolvedPlatform {
  platform?: Platform;
  /** The custom `assetUrl` function, or the platform's URL helper. */
  wrapUrl?: AssetUrlFunction;
}

/** Combines `platform` with the deprecated ways of choosing one. */
export function resolvePlatform({
  platform,
  assetUrl,
  cdn,
}: VitePluginSrcUpdateOptions): ResolvedPlatform {
  const name =
    platform ??
    (typeof assetUrl === "string" ? assetUrl : cdn ? "bigcommerce" : undefined);
  if (name !== undefined && !(name in PLATFORM_URLS)) {
    throw new Error(
      `${PREFIX} Unknown platform "${name}". Use one of: ` +
        `${Object.keys(PLATFORM_URLS).join(", ")}.`
    );
  }
  return {
    platform: name,
    wrapUrl:
      typeof assetUrl === "function"
        ? assetUrl
        : name && PLATFORM_URLS[name],
  };
}

/** Warnings about unknown and deprecated options, to log once Vite's logger exists. */
export function checkOptions(options: VitePluginSrcUpdateOptions): string[] {
  const warnings = Object.keys(options)
    .filter((key) => !(key in OPTION_KEYS))
    .map((key) => `Unknown option "${key}" is ignored.`);
  if (typeof options.assetUrl === "string") {
    warnings.push(
      `assetUrl: "${options.assetUrl}" is deprecated, use platform: "${options.assetUrl}".`
    );
  }
  if (options.cdn) {
    warnings.push(`cdn is deprecated, use platform: "bigcommerce".`);
  }
  if (options.outDir !== undefined) {
    warnings.push(`outDir is deprecated, use base.`);
  }
  return warnings;
}

/**
 * Fills in Vite options the user left unset, once for all templates:
 * the build input (from every template's `input`) and platform defaults.
 */
export function defaultsPlugin(list: VitePluginSrcUpdateOptions[]): Plugin {
  let devOrigin: string | undefined;
  let logger: Logger | undefined;
  const withDevOrigin = (code: string) =>
    devOrigin && code.includes(ORIGIN_PLACEHOLDER)
      ? code.replaceAll(ORIGIN_PLACEHOLDER, devOrigin)
      : undefined;

  return {
    name: `${NAME}:defaults`,

    config(userConfig, { command }): UserConfig {
      const platforms = new Set(list.map((o) => resolvePlatform(o).platform));
      const build = userConfig.build ?? {};
      const server = userConfig.server ?? {};
      const defaults: UserConfig = { build: {}, server: {} };

      // Dev asset URLs (CSS url(), imported fonts and images) must point at the
      // dev server, not at the backend serving the page. The real origin is
      // only known once the server listens, so start with a placeholder.
      if (command === "serve" && !server.origin && !server.middlewareMode) {
        defaults.server!.origin = ORIGIN_PLACEHOLDER;
      }

      if (!hasInput(build)) {
        const root = path.resolve(userConfig.root ?? "");
        const input = [
          ...new Set(list.flatMap((o) => expandInputs(o.input ?? [], root))),
        ];
        if (input.length) {
          // `rolldownOptions` is Vite 8+, `rollupOptions` covers Vite 5–7.
          const key = Number(version.split(".")[0]) >= 8 ? "rolldownOptions" : "rollupOptions";
          Object.assign(defaults.build!, { [key]: { input } });
        }
      }

      // Assets on a CDN must load chunks, fonts and images relative to the
      // file that references them, not from the store's own domain.
      const usesCdn = [...platforms].some((p) => p && CDN_PLATFORMS.has(p));
      if (usesCdn && userConfig.base === undefined) defaults.base = "./";

      if (platforms.has("shopify")) {
        // Shopify serves theme assets from a flat folder.
        if (build.assetsDir === undefined) defaults.build!.assetsDir = "";
        // Let theme previews on the store's domains (custom and market
        // domains included) load dev server assets.
        if (server.cors === undefined) {
          // Shopify CLI's SHOPIFY_FLAG_STORE narrows it to that store's domains.
          defaults.server!.cors = shopifyCors({
            store: process.env.SHOPIFY_FLAG_STORE,
            logger: () => logger,
          });
        }
      }

      return defaults;
    },

    configResolved(config) {
      logger = config.logger;
    },

    configureServer(server) {
      onDevOrigin(server, (origin) => {
        devOrigin = origin;
      });
    },

    transform(code) {
      return withDevOrigin(code);
    },

    transformIndexHtml: {
      order: "post",
      handler: (html) => withDevOrigin(html),
    },
  };
}

function hasInput(build: NonNullable<UserConfig["build"]>): boolean {
  const { rolldownOptions } = build as { rolldownOptions?: { input?: unknown } };
  return (
    rolldownOptions?.input !== undefined ||
    build.rollupOptions?.input !== undefined
  );
}
