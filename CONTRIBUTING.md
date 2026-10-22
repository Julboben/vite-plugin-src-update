# Contributing

## Setup

Use the Node.js version in `.nvmrc` (`nvm use`), then:

```sh
npm ci
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/index.ts` | The plugin: options, Vite hooks, dev server origin |
| `src/build.ts` | Turns the build output into tags (input filtering, CSS, preloads, legacy) |
| `src/tags.ts` | Tag rendering and `assetUrl` presets |
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

The playground writes its generated templates to `playground/templates/` (one per `assetUrl` preset) and updates the tags between the markers in `playground/index.html`. Both are gitignored.

To test against another Vite major version locally:

```sh
npm install --no-save vite@5 && npm test
npm ci # restore
```

CI runs the tests for Node 20, 22 and 24 against Vite 5, 6, 7 and 8.

## Releasing

Releases are published from `main` by `.github/workflows/release.yml`:

1. On `develop`, bump the version with `npm run version-up` (patch), or `npm version minor --no-git-tag-version`.
2. Add a `## <version>` section to `CHANGELOG.md`.
3. Merge `develop` into `main`.

The workflow then:

1. Runs the full CI workflow.
2. Publishes to npm if that version isn't published yet. It uses [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/), so no `NPM_TOKEN` is stored, and [provenance](https://docs.npmjs.com/generating-provenance-statements) is added automatically.
3. Creates the `v<version>` tag and a GitHub release, using the matching `CHANGELOG.md` section as notes.

Trusted publishing must be configured on npmjs.com for this repository and the `release.yml` workflow. If it was set up for the old `publish.yml`, update the workflow file name there.
