// Used by .github/workflows/release.yml.
//
//   node scripts/changelog.mjs release <version>  Renames "## Unreleased" to "## <version>"
//                                                 and starts a new empty Unreleased section.
//   node scripts/changelog.mjs notes <version>    Prints the notes for <version>.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../CHANGELOG.md", import.meta.url);
const [command, version] = process.argv.slice(2);

if (!["release", "notes"].includes(command) || !version) {
  console.error("Usage: node scripts/changelog.mjs <release|notes> <version>");
  process.exit(1);
}

const changelog = readFileSync(FILE, "utf8");
// Split into sections at each "## " heading; the first entry is the intro.
const sections = changelog.split(/^(?=## )/m);
const find = (heading) =>
  sections.findIndex((s) => s.split("\n", 1)[0].trim() === `## ${heading}`);
const body = (section) => section.slice(section.indexOf("\n") + 1).trim();

if (command === "notes") {
  const index = find(version);
  if (index === -1) {
    console.error(`CHANGELOG.md has no "## ${version}" section.`);
    process.exit(1);
  }
  process.stdout.write(`${body(sections[index])}\n`);
} else {
  const index = find("Unreleased");
  if (index === -1 || !body(sections[index])) {
    console.error(
      `Add release notes under "## Unreleased" in CHANGELOG.md before releasing.`
    );
    process.exit(1);
  }
  if (find(version) !== -1) {
    console.error(`CHANGELOG.md already has a "## ${version}" section.`);
    process.exit(1);
  }
  sections[index] = sections[index].replace(
    /^## Unreleased/,
    `## Unreleased\n\n## ${version}`
  );
  writeFileSync(FILE, sections.join(""));
}
