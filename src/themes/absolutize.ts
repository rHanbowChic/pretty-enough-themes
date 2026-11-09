/**
 * Makes the url()s and @import addresses of `css`, served from `base`, absolute and https.
 * The extension puts a theme's text into the page, where relative addresses would resolve
 * against the wikidot site; http resources would be blocked on https pages.
 * scripts/fetch-themes.mjs has a copy of this for the built-in themes.
 */
export function absolutize(css: string, base: string): string {
  const fix = (url: string) => {
    // Fixes typos like Maple's `hhttp://`.
    const fixed = url.replace(/^h+ttp(s?):/i, 'http$1:')
    try {
      return new URL(fixed, base).href.replace(/^http:/, 'https:')
    } catch {
      return url
    }
  }
  return css
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (match, _quote, url: string) =>
      url === '' || url.startsWith('data:') || url.startsWith('#') ? match : `url("${fix(url)}")`,
    )
    .replace(/@import\s+(['"])(.*?)\1/g, (_match, _quote, url: string) => `@import "${fix(url)}"`)
}
