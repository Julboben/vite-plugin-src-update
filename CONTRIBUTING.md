# Contributing

## Setup

Use the Node.js version in `.nvmrc` (`nvm use`), then:

```sh
npm ci
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/index.ts` | The plugin per template: options and Vite hooks for dev and build |
| `src/config.ts` | Option checks, platform resolution and the Vite defaults applied once for all templates (build input, platform defaults) |
| `src/inputs.ts` | Expands input folders into entry files |
| `src/dev.ts` | The dev server's public origin, and the placeholder that points dev asset URLs at it |
| `src/cors.ts` | CORS for Shopify previews: allows the store's domains via their `/meta.json` |
| `src/build.ts` | Turns the build output into tags (input filtering, CSS, preloads, legacy) |
| `src/tags.ts` | Tag rendering and the URL helper per platform |
| `src/template.ts` | Header comments per extension, markers and safe writes |
| `test/` | `node:test` suites that run real Vite builds and dev servers against `dist/` |
| `playground/` | A demo project using the plugin from `src/` |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run check` | Typecheck `src/` and the playground config |
| `npm run build` | Compile `src/` to `dist/` |
| `npm test` | Build, then run the tests |
| `npm run lint:package` | Check the packed package with publint and Are The Types Wrong |
| `npm run playground:dev` | Start the playground with Vite's dev server |
| `npm run playground:build` | Build the playground and update its templates |
| `npm run playground:preview` | Build, then serve the playground from a plain Node server, like a backend would |

The playground writes its generated templates to `playground/templates/` (one per platform) and updates the tags between the markers in `playground/index.html`. Both are gitignored.

To test against another Vite major version locally:

```sh
npm install --no-save vite@5 && npm test
npm ci # restore
```

CI runs the tests for Node 20, 22, 24 and 26 against Vite 5, 6, 7 and 8.

## Workflow

Work on a branch and open a pull request into `main`; CI runs on every pull request. Add a line under `## Unreleased` in `CHANGELOG.md` for anything users will notice. Merging doesn't publish anything.

## Releasing

Releases are made from GitHub, with nothing to run locally:

1. Make sure `## Unreleased` in `CHANGELOG.md` on `main` describes the changes. The release fails if it's empty.
2. Go to **Actions → Release → Run workflow**, keep the branch on `main`, pick **patch**, **minor** or **major**, and run it.

The workflow (`.github/workflows/release.yml`) then:

1. Runs the full CI workflow on `main`.
2. Bumps the version in `package.json` and `package-lock.json`, and renames `## Unreleased` in `CHANGELOG.md` to the new version (via `scripts/changelog.mjs`).
3. Commits this as `Release v<version>` and pushes the commit and the `v<version>` tag to `main`.
4. Publishes that tag to npm. It uses [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/), so no `NPM_TOKEN` is stored, and [provenance](https://docs.npmjs.com/generating-provenance-statements) is added automatically.
5. Creates the GitHub release for the tag, using the version's `CHANGELOG.md` section as notes.

If publishing or the GitHub release fails after the tag was pushed, use **Re-run failed jobs** on the same run. It reuses the version that was already tagged and skips publishing if npm already has it.

### One-time repository setup

- **npm:** configure a Trusted Publisher on npmjs.com for this repository and the `release.yml` workflow.
- **Branch protection:** if `main` requires pull requests, allow the GitHub Actions app to bypass that rule (Settings → Rules), so the release commit can be pushed.
- **Tag protection:** add a ruleset for `v*` tags so they can't be moved or deleted.
