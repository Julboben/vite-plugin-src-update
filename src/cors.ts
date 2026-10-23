import type { CorsOptions, Logger } from "vite";

/** Vite's default `server.cors` origins (localhost and 127.0.0.1 on any port). */
const LOCALHOST_ORIGIN =
  /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const MYSHOPIFY_ORIGIN = /^https:\/\/[a-z0-9-]+\.myshopify\.com$/;
const MYSHOPIFY_DOMAIN = /^[a-z0-9-]+\.myshopify\.com$/;

/** Shop details from a storefront's public `/meta.json`. */
export interface StoreMeta {
  name?: string;
  myshopify_domain?: string;
}

export type FetchStoreMeta = (origin: string) => Promise<StoreMeta | undefined>;

export interface ShopifyCorsOptions {
  /** Only allow domains of this store, e.g. `my-shop.myshopify.com` (from `SHOPIFY_FLAG_STORE`). */
  store?: string;
  /** Returns the logger once Vite has created it. */
  logger: () => Logger | undefined;
  /** Overridable for tests. */
  fetchStoreMeta?: FetchStoreMeta;
}

/**
 * CORS for Shopify theme previews: allows pages on localhost, and pages on
 * any domain that is a Shopify storefront (or one of `store`'s domains when
 * set) — including custom and market domains, without listing them.
 *
 * A domain is checked once per dev session by requesting its `/meta.json`,
 * which every Shopify storefront serves, even when password-protected.
 */
export function shopifyCors({
  store,
  logger,
  fetchStoreMeta = fetchMetaJson,
}: ShopifyCorsOptions): CorsOptions {
  const expected = normalizeStore(store);
  const checks = new Map<string, Promise<boolean>>();

  const check = async (origin: string): Promise<boolean> => {
    const meta = await fetchStoreMeta(origin).catch(() => undefined);
    const domain = meta?.myshopify_domain?.toLowerCase();
    const allowed =
      !!domain && MYSHOPIFY_DOMAIN.test(domain) && (!expected || domain === expected);
    const log = logger();
    if (allowed) {
      log?.info(
        `[vite-plugin-src-update] Allowing dev assets for ${origin} (${meta?.name ?? domain}).`,
        { timestamp: true }
      );
    } else {
      log?.warn(
        `[vite-plugin-src-update] Blocked dev assets for ${origin}: ` +
          (domain
            ? `it belongs to ${domain}, not ${expected}.`
            : `it isn't a Shopify storefront.`) +
          ` Add it to server.cors if it should be allowed.`,
        { timestamp: true }
      );
    }
    return allowed;
  };

  return {
    origin(origin, callback) {
      const done = (allowed: boolean) =>
        (callback as (err: Error | null, allow: boolean) => void)(null, allowed);

      // Requests without an Origin header (same-origin, curl) need no CORS headers.
      if (!origin) return done(false);
      if (LOCALHOST_ORIGIN.test(origin)) return done(true);
      if (!expected && MYSHOPIFY_ORIGIN.test(origin)) return done(true);
      if (!origin.startsWith("https://")) return done(false);

      let result = checks.get(origin);
      if (!result) {
        result = check(origin);
        checks.set(origin, result);
      }
      result.then(done, () => done(false));
    },
  };
}

/** `my-shop`, `my-shop.myshopify.com` or `https://my-shop.myshopify.com/` → `my-shop.myshopify.com`. */
export function normalizeStore(store: string | undefined): string | undefined {
  if (!store) return undefined;
  const host = store
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return host.endsWith(".myshopify.com") ? host : `${host}.myshopify.com`;
}

async function fetchMetaJson(origin: string): Promise<StoreMeta | undefined> {
  const response = await fetch(`${origin}/meta.json`, {
    // A redirect could point at another store's meta.json, so only accept a
    // direct answer from the domain itself.
    redirect: "manual",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return undefined;
  return (await response.json()) as StoreMeta;
}
