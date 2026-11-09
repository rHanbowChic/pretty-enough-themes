// Downloads the built-in themes from themes.wikidot.com into src/themes/<id>.css.
//
// The extension injects a theme's text into the page, where relative url()s would resolve
// against the wikidot site instead of the theme's own host, so they are made absolute here.
// http:// links become https:// (wikidot pages are https; http images would be blocked).
// Run `npm run themes` to refresh them; the files are committed, so builds need no network.
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Keep in sync with BUILTIN_THEMES in src/themes/index.ts. */
const THEMES = [
  { id: 'midnight-coal', name: 'Midnight Coal', author: 'pieterh' },
  { id: 'monobook', name: 'Monobook', author: 'Fereal' },
  { id: 'maple', name: 'Maple', author: 'bcammo' },
]

for (const theme of THEMES) {
  const source = `https://themes.wdfiles.com/local--code/${theme.id}`
  const response = await fetch(source)
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`)
  const css = absolutize(await response.text(), source)
  const header = [
    '/*',
    ` * ${theme.name} by ${theme.author}`,
    ` * https://themes.wikidot.com/${theme.id}`,
    ' * License: Creative Commons Attribution-ShareAlike 3.0',
    ` * Downloaded from ${source} by scripts/fetch-themes.mjs;`,
    ' * url()s made absolute and https. Do not edit by hand.',
    ' */',
    '',
  ].join('\n')
  await writeFile(resolve(root, `src/themes/${theme.id}.css`), header + css)
  console.log(`${theme.id}: ${css.length} bytes`)
}

// The url() part of src/themes/absolutize.ts (used for clones), which cannot be imported here.
function absolutize(css, base) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (match, quote, url) => {
    if (url === '' || url.startsWith('data:')) return match
    // Fixes typos like Maple's `hhttp://`.
    const fixed = url.replace(/^h+ttp(s?):/i, 'http$1:')
    const absolute = new URL(fixed, base).href.replace(/^http:/, 'https:')
    return `url("${absolute}")`
  })
}
