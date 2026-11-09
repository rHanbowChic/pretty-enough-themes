import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(resolve(root, '../package.json'), 'utf8'))

export default defineConfig({
  root,
  // Relative, so the site works from any path, such as a project page on GitHub Pages.
  base: './',
  define: { __VERSION__: JSON.stringify(version) },
  server: { fs: { allow: [resolve(root, '..')] } },
  build: {
    // The popup uses top-level await.
    target: 'es2022',
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),
        page: resolve(root, 'frames/page.html'),
        popup: resolve(root, 'frames/popup.html'),
        options: resolve(root, 'frames/options.html'),
      },
    },
  },
})
