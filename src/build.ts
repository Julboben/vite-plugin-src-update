import { createHash } from "node:crypto";
import { normalizePath } from "vite";
import {
  inlineScript,
  modulePreload,
  moduleScript,
  stylesheet,
  type Attributes,
  type HtmlTag,
} from "./tags.js";

/** The parts of Rollup/Rolldown's output chunk this plugin relies on. */
export interface BundleChunk {
  type: "chunk";
  fileName: string;
  isEntry: boolean;
  facadeModuleId: string | null;
  imports: string[];
  code: string;
  viteMetadata?: { importedCss: Set<string> };
}

/** The parts of Rollup/Rolldown's output asset this plugin relies on. */
export interface BundleAsset {
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
  originalFileNames?: readonly string[];
}

export type BundleFile = BundleChunk | BundleAsset;

export interface BuildInput {
  /** Normalised absolute path, comparable to `facadeModuleId`. */
  id: string;
  /** Normalised path relative to the Vite root, comparable to `originalFileNames`. */
  relative: string;
}

export interface BuildTagOptions {
  /** All files written in this build, across outputs (e.g. modern + legacy). */
  files: Map<string, BundleFile>;
  /** Entries to include, in order. Empty means every entry in the bundle. */
  inputs: BuildInput[];
  /** Turns a file name relative to `outDir` into the attribute value. */
  url: (fileName: string) => string;
  modulePreload: boolean;
  integrity: boolean;
  attributes: Attributes;
}

export interface BuildTagResult {
  tags: HtmlTag[];
  /** Inputs that matched nothing in the bundle. */
  unmatched: string[];
}

const LEGACY_POLYFILLS_ID = "\0vite/legacy-polyfills";

const isCss = (file: BundleFile): file is BundleAsset =>
  file.type === "asset" && file.fileName.endsWith(".css");
const isLegacy = (chunk: BundleChunk) => chunk.fileName.includes("-legacy");
const isPolyfills = (chunk: BundleChunk) =>
  chunk.facadeModuleId?.startsWith(LEGACY_POLYFILLS_ID) ?? false;

export function collectBuildTags({
  files,
  inputs,
  url,
  modulePreload: preload,
  integrity,
  attributes,
}: BuildTagOptions): BuildTagResult {
  const all = [...files.values()];
  const chunks = all.filter((f): f is BundleChunk => f.type === "chunk");
  const entries = chunks.filter((c) => c.isEntry && !isPolyfills(c));

  const modern: BundleChunk[] = [];
  const legacy: BundleChunk[] = [];
  const cssEntries: BundleAsset[] = [];
  const unmatched: string[] = [];

  if (inputs.length) {
    for (const input of inputs) {
      const matches = entries.filter(
        (c) => c.facadeModuleId && normalizePath(c.facadeModuleId) === input.id
      );
      const css = matches.length
        ? []
        : all.filter(
            (f) => isCss(f) && f.originalFileNames?.includes(input.relative)
          ) as BundleAsset[];
      if (!matches.length && !css.length) unmatched.push(input.relative);
      for (const chunk of matches) (isLegacy(chunk) ? legacy : modern).push(chunk);
      cssEntries.push(...css);
    }
  } else {
    for (const chunk of entries) (isLegacy(chunk) ? legacy : modern).push(chunk);
    cssEntries.push(...(all.filter(isCss) as BundleAsset[]));
  }

  // Walk static imports like Vite's own HTML plugin: CSS of dependencies
  // first, then the entry's own CSS, plus every imported chunk for preloading.
  const styles = new Set<string>();
  const preloads = new Set<string>();
  const seen = new Set<string>();
  const visit = (chunk: BundleChunk) => {
    for (const fileName of chunk.imports) {
      const dep = files.get(fileName);
      if (dep?.type !== "chunk" || seen.has(fileName)) continue;
      seen.add(fileName);
      visit(dep);
      preloads.add(fileName);
    }
    chunk.viteMetadata?.importedCss.forEach((css) => styles.add(css));
  };
  modern.forEach(visit);
  cssEntries.forEach((asset) => styles.add(asset.fileName));
  modern.forEach((chunk) => preloads.delete(chunk.fileName));

  const attrsFor = (fileName: string): Attributes => {
    const hash = integrity ? hashOf(files.get(fileName)) : undefined;
    return hash
      ? { integrity: hash, crossorigin: true, ...attributes }
      : attributes;
  };

  const tags: HtmlTag[] = [
    ...[...styles].map((f) => stylesheet(url(f), attrsFor(f))),
    ...chunks
      .filter((c) => isPolyfills(c) && !isLegacy(c))
      .map((c) => moduleScript(url(c.fileName), attrsFor(c.fileName))),
    ...(preload
      ? [...preloads].map((f) => modulePreload(url(f), attrsFor(f)))
      : []),
    ...modern.map((c) => moduleScript(url(c.fileName), attrsFor(c.fileName))),
  ];

  if (legacy.length) {
    // Mirrors the markup Vite generates for @vitejs/plugin-legacy.
    const polyfills = chunks.find((c) => isPolyfills(c) && isLegacy(c));
    if (polyfills) {
      tags.push({
        tag: "script",
        attrs: {
          nomodule: true,
          crossorigin: true,
          id: "vite-legacy-polyfill",
          src: url(polyfills.fileName),
          ...attributes,
        },
      });
    }
    legacy.forEach((chunk, i) => {
      const id = i === 0 ? "vite-legacy-entry" : `vite-legacy-entry-${i + 1}`;
      tags.push(
        inlineScript(
          `System.import(document.getElementById('${id}').getAttribute('data-src'))`,
          {
            nomodule: true,
            crossorigin: true,
            id,
            "data-src": url(chunk.fileName),
            ...attributes,
          }
        )
      );
    });
  }

  return { tags, unmatched };
}

function hashOf(file: BundleFile | undefined): string | undefined {
  if (!file) return undefined;
  const source = file.type === "chunk" ? file.code : file.source;
  return `sha384-${createHash("sha384").update(source).digest("base64")}`;
}
