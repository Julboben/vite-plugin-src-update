# vite-plugin-src-update

`update-vite-tag` is a Vite plugin that automatically updates a template file with development or production script tags for your project assets, ensuring the correct scripts are loaded depending on your build environment. It supports configuration for development scripts, CDN usage, and custom template file paths.

## Installation

```sh
npm install vite-plugin-src-update
```

# Usage

Import the plugin in your `vite.config.js`:


```
import { viteSrcUpdate } from 'vite-plugin-src-update':

export default {
  plugins: [
    viteSrcUpdate({
      scriptsInDev: ['path/to/dev/script.js'],
      devServerAddress: 'http://localhost:3000',
      templateFilePath: 'path/to/template.html',
      entrypointsDir: 'path/to/entrypoints',
      cdn: false
    })
  ]
}
```

# Options

* `scriptsInDev`: Array of script paths to include in development mode.
* `devServerAddress`: Address of the development server.
* `templateFilePath`: Path to the template file.
* `entrypointsDir`: Directory where the entrypoints are located.
* `cdn`: Whether to use a CDN for the script