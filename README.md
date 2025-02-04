# vite-plugin-src-update

`vite-plugin-src-update` is a Vite plugin that automatically updates a template file with development or production script tags for your project assets, ensuring the correct scripts are loaded depending on your build environment. It supports multiple coding languages, configuration for CDN usage, and custom template file path.

## Installation

```sh
npm install vite-plugin-src-update --save-dev
```

## Usage

Import the plugin in your `vite.config.js`:

```ts
import vitePluginSrcUpdate from 'vite-plugin-src-update':

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
* `outDir`: The directory where the bundled scripts are outputted. If you don't specify outDir, it will use the build.outDir.
* `input`: Array of entry points for the scripts and styles to be included in the template. If you don't specify input, it will use the rollupOptions input.
* `cdn`: Whether to use a CDN for the script. Defaults to `false`.

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

## MIT License

Copyright (c) 2024 Julian Bo Bendtsen

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
