// Minimal stand-in for a backend (Stencil, Shopify, IIS…): serves the
// playground's index.html and built assets without any Vite involvement.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = import.meta.dirname;
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const file = pathname === "/" ? "index.html" : normalize(decodeURIComponent(pathname)).slice(1);
  const allowed = file === "index.html" || file.startsWith(join("dist", "/"));
  try {
    if (!allowed) throw new Error("Not found");
    const body = await readFile(join(root, file));
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Playground backend: http://localhost:${port}/`));
