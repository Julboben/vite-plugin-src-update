import type { AssetUrlFunction, Platform } from "./options.js";

export type Attributes = Record<string, string | boolean | undefined>;

export interface HtmlTag {
  tag: "script" | "link";
  attrs: Attributes;
  /** Inline content for `<script>` tags. */
  children?: string;
}

export const PLATFORM_URLS: Record<Platform, AssetUrlFunction> = {
  bigcommerce: (url) => `{{cdn '${url}'}}`,
  // Drop Shopify's `?v=` query: chunks import each other by plain file name,
  // so a modulepreload for `chunk.js?v=1` would be a different URL and
  // download the file twice.
  shopify: (_url, fileName) =>
    `{{ '${fileName}' | asset_url | split: '?' | first }}`,
  razor: (url) => `@Url.Content("${toAppRelative(url)}")`,
  webforms: (url) => `<%= ResolveUrl("${toAppRelative(url)}") %>`,
};

/** `/dist/main.js` → `~/dist/main.js`; absolute URLs are left alone. */
function toAppRelative(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? `~${url}` : url;
}

/** Percent-encodes characters that would break out of an attribute or a quoted template string. */
export function encodeFileName(fileName: string): string {
  return encodeURI(fileName).replaceAll("'", "%27");
}

export function renderTag({ tag, attrs, children = "" }: HtmlTag): string {
  const attributes = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${value}"`))
    .join("");
  return tag === "link"
    ? `<link${attributes}>`
    : `<script${attributes}>${children}</script>`;
}

export const moduleScript = (src: string, attrs: Attributes = {}): HtmlTag => ({
  tag: "script",
  attrs: { type: "module", src, ...attrs },
});

export const inlineScript = (
  children: string,
  attrs: Attributes = {}
): HtmlTag => ({ tag: "script", attrs, children });

export const stylesheet = (href: string, attrs: Attributes = {}): HtmlTag => ({
  tag: "link",
  attrs: { rel: "stylesheet", href, ...attrs },
});

export const modulePreload = (href: string, attrs: Attributes = {}): HtmlTag => ({
  tag: "link",
  attrs: { rel: "modulepreload", href, ...attrs },
});
