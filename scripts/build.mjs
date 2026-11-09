// Builds the extension into build/. Pass --watch to rebuild on changes, and
// --target=firefox to build the Firefox variant into build-firefox/ instead.
//
//   popup.html, options.html  regular pages
//   background.js             service worker (Firefox: background script)
//   content/theme.js          content script (classic script), built-in themes inlined
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const watch = process.argv.includes('--watch')
const firefox = process.argv.includes('--target=firefox')
const outDir = resolve(root, firefox ? 'build-firefox' : 'build')

const base = (overrides) => ({
  root,
  configFile: false,
  logLevel: 'warn',
  publicDir: false,
  base: './',
  ...overrides,
  build: {
    outDir,
    emptyOutDir: false,
    watch: watch ? {} : null,
    reportCompressedSize: false,
    // The popup uses top-level await.
    target: 'es2022',
    ...overrides.build,
  },
})

const script = (entry, fileName) =>
  base({
    build: {
      lib: {
        entry: resolve(root, entry),
        formats: ['iife'],
        name: 'prettyEnoughThemes',
        fileName: () => fileName,
      },
    },
  })

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const manifest = JSON.parse(await readFile(resolve(root, 'src/manifest.json'), 'utf8'))
manifest.version = pkg.version
if (firefox) toFirefox(manifest)
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

await Promise.all([
  build(
    base({
      publicDir: resolve(root, 'public'),
      build: {
        rollupOptions: {
          input: {
            popup: resolve(root, 'popup.html'),
            options: resolve(root, 'options.html'),
          },
        },
      },
    }),
  ),
  build(script('src/background.ts', 'background.js')),
  build(script('src/content/theme.ts', 'content/theme.js')),
])

if (!watch) console.log(`Built extension into ${outDir}`)

// Firefox MV3 has no background service worker, and needs a gecko ID to sign.
function toFirefox(manifest) {
  delete manifest.minimum_chrome_version
  manifest.background = { scripts: [manifest.background.service_worker] }
  manifest.browser_specific_settings = {
    gecko: {
      id: 'pretty-enough-themes@ect.fyi',
      strict_min_version: '128.0',
      data_collection_permissions: { required: ['none'] },
    },
  }
}
