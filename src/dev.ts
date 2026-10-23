import type { ViteDevServer } from "vite";

/**
 * Stand-in for `server.origin` until the dev server is listening and its
 * address is known. Vite prefixes dev asset URLs (CSS `url()`, imported
 * images and fonts) with `server.origin`; without it they'd be root-relative
 * and resolve against the backend's host instead of the dev server.
 */
export const ORIGIN_PLACEHOLDER = "__vite_plugin_src_update_origin__";

const WILDCARD_HOSTS = new Set(["", "0.0.0.0", "::"]);

/**
 * Calls `callback` with the dev server's public origin: `server.origin` when
 * you set it, otherwise the address it listens on. Gets `undefined` in
 * middleware mode without `server.origin`, where the address is unknown.
 */
export function onDevOrigin(
  server: ViteDevServer,
  callback: (origin: string | undefined) => void
): void {
  const configured = server.config.server.origin;
  const origin =
    configured && configured !== ORIGIN_PLACEHOLDER
      ? configured.replace(/\/+$/, "")
      : undefined;

  // Middleware mode: Vite never listens itself.
  if (!server.httpServer) return callback(origin);

  server.httpServer.once("listening", () => {
    const address = server.httpServer?.address();
    if (!address || typeof address !== "object") return;
    callback(origin ?? listeningOrigin(server, address));
  });
}

function listeningOrigin(
  server: ViteDevServer,
  { address, port }: { address: string; port: number }
): string {
  const protocol = server.config.server.https ? "https" : "http";
  const { host } = server.config.server;
  // Prefer a configured hostname (e.g. "mysite.local"), so it matches the
  // HTTPS certificate, over the IP address it resolved to.
  let hostname =
    typeof host === "string" && !WILDCARD_HOSTS.has(host) ? host : address;
  if (WILDCARD_HOSTS.has(hostname) || hostname === "::1") hostname = "localhost";
  if (hostname.includes(":")) hostname = `[${hostname}]`;
  return `${protocol}://${hostname}:${port}`;
}
