# vite-plugin-src-update

`update-vite-tag` is a Vite plugin that automatically updates a template file with development or production script tags for your project assets, ensuring the correct scripts are loaded depending on your build environment. It supports multiple coding languages, configuration for CDN usage, and custom template file path.

## Installation

```sh
npm install vite-plugin-src-update
```

# Usage

Import the plugin in your `vite.config.js`:


```
import viteSrcUpdate from 'vite-plugin-src-update':

export default {
  plugins: [
    viteSrcUpdate({
      templateFilePath: 'path/to/template.html',
      entrypointsDir: 'path/to/entrypoints',
      cdn: false
    })
  ]
}
```

# Options

* `templateFilePath`: Path to the template file.
* `entrypointsDir`: Directory where the entrypoints are located.
* `cdn`: Whether to use a CDN for the script

# MIT License

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