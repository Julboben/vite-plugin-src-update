# vite-plugin-src-update

`vite-plugin-src-update` is a Vite plugin that automatically updates a template file with development or production script tags for your project assets, ensuring the correct scripts are loaded depending on your build environment. It supports multiple coding languages, configuration for CDN usage, and custom template file path.

Compatible with Vite 5, 6, 7 and 8 (Node.js `^20.19.0 || >=22.12.0`).

## Installation

```sh
npm install vite-plugin-src-update --save-dev
```

## Usage

Import the plugin in your `vite.config.js`:

```ts
import vitePluginSrcUpdate from 'vite-plugin-src-update';

export default {
  plugins: [
    vitePluginSrcUpdate({
      templateFilePath: 'path/to/template.html',
      outDir: 'path/to/outDir',
      input: ["src/entrypoints/example.js", "src/styles/example.css"],
      cdn: false
    })
  ]
}
```

## Options

* `templateFilePath`: Required -- Path to the template file.
* `outDir`: The directory where the bundled scripts are outputted. If you don't specify `outDir`, it will use `build.outDir`.
* `input`: Array of entry points for the scripts and styles to be included in the template. If you don't specify `input`, it will use the `rolldownOptions`/`rollupOptions` input.
* `cdn`: Whether to wrap built asset paths in a `{{cdn '...'}}` helper (e.g. BigCommerce Stencil's Handlebars CDN helper) so URLs are rewritten to the platform's CDN at render time. Defaults to `false`.
* `injectClient`: Whether to inject Vite's HMR client (`@vite/client`) in dev mode so backend-served pages get hot module replacement. Defaults to `true`.
* `verbose`: Log additional diagnostic information. Defaults to `false`.
* `dryRun`: Compute the output without writing the template file. Defaults to `false`.
* `commentTemplates`: Per-extension formatters for the auto-generated header comment. Defaults cover `.html`, `.liquid`, `.hbs` and `.cshtml`.

You can also pass an array of objects to update multiple template files.

```ts
export default {
  plugins: [
    vitePluginSrcUpdate([
      {
        templateFilePath: 'path/to/template.html',
        input: ["src/entrypoints/example.js"],
      },
      {
        templateFilePath: 'path/to/another/template.html',
        outDir: 'path/to/outDir',
        input: ["src/styles/example.css"],
      },
    ]),
  ]
}
```

## What kinds of projects is this for?

This plugin shines whenever Vite isn't the thing serving your HTML — i.e. a separate platform or backend renders the markup and just needs the right `<script>`/`<link>` tags pointing at your Vite assets. Because it writes a ready-to-include snippet (dev-server URLs while developing, hashed file paths after a build) directly into a template file, the host platform doesn't need to read a manifest or run any Vite integration at request time.

Typical use cases include:

* **E-commerce themes** — Shopify (Liquid), BigCommerce Stencil (Handlebars), and similar platforms where storefront templates are rendered server-side. The `cdn` option emits a `{{cdn '...'}}` helper for platforms that serve assets through their own CDN.
* **Server-rendered .NET** — classic ASP.NET (non-Core) MVC / Web Forms `.cshtml` Razor views, where there's no first-party Vite tag helper to lean on.
* **Other templating engines** — Handlebars, Mustache, and anything else where you'd otherwise hand-maintain the asset tags. Add your own extension to `commentTemplates` to format the generated header comment for it.
* **Any multi-target build** — pass an array of configs to keep several template files (across different platforms) in sync from a single Vite build.

Out of the box, the auto-generated header comment is formatted for `.html`, `.liquid`, `.hbs` and `.cshtml`, and you can extend it to any other extension.

## Publishing

This package uses a GitHub Action to automatically publish to npm when changes are pushed to the `main` branch. The workflow:

1. Checks out the code
2. Sets up Node.js 22.x
3. Installs dependencies
4. Builds the package
5. Publishes to npm

To enable automated publishing, add an `NPM_TOKEN` secret to your repository settings with a valid npm access token.

## MIT License

Copyright (c) 2025 Julian Bo Bendtsen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
