import fs from "node:fs";
import path from "node:path";

/** Script and style files that can be entries; type declarations are skipped. */
const ENTRY_FILE = /\.(?:[cm]?[jt]sx?|css|less|sass|scss|styl|stylus|pcss|postcss)$/;
const DECLARATION_FILE = /\.d\.[cm]?ts$/;

/**
 * Resolves inputs against the Vite root. Directories expand to every script
 * and style file inside them (recursively, sorted for stable output).
 */
export function expandInputs(inputs: string[], root: string): string[] {
  return inputs.flatMap((input) => {
    const absolute = path.resolve(root, input);
    if (!isDirectory(absolute)) return [absolute];
    return fs
      .readdirSync(absolute, { recursive: true, encoding: "utf8" })
      .filter((file) => ENTRY_FILE.test(file) && !DECLARATION_FILE.test(file))
      .map((file) => path.join(absolute, file))
      .filter((file) => !isDirectory(file))
      .sort();
  });
}

function isDirectory(file: string): boolean {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}
