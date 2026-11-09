import { importedUrls } from './imports'
import { MESSAGE_FETCH_CSS, type FetchCssMessage } from './messages'
import { loadSettings, saveSettings, themeUrls, type CustomSource, type Settings } from './settings'
import { extractThemeColors } from './theme-colors'

const fetchCss = (url: string): Promise<string | null> =>
  fetch(url, { credentials: 'omit' })
    .then((response) => (response.ok ? response.text() : null))
    .catch(() => null)

// Stylesheets the content script wants to read (content scripts are bound by the page's CORS).
chrome.runtime.onMessage.addListener((message: FetchCssMessage, _sender, sendResponse) => {
  if (message?.type !== MESSAGE_FETCH_CSS || !/^https?:/.test(message.url)) return
  fetchCss(message.url).then(sendResponse)
  return true
})

/** How deep @imports are followed. */
const MAX_DEPTH = 3
const NOT_CSS = /\.(?:otf|ttf|woff2?|eot)(?:[?#]|$)/i

/** `css` after the stylesheets it @imports, which it comes after in the page too. */
async function withImports(css: string, base: string | undefined, depth = 0): Promise<string> {
  if (depth >= MAX_DEPTH) return css
  const imported = await Promise.all(
    importedUrls(css).map(async (url) => {
      if (NOT_CSS.test(url)) return ''
      let absolute: string
      try {
        absolute = new URL(url, base).href
      } catch {
        return ''
      }
      const text = await fetchCss(absolute)
      return text === null ? '' : withImports(text, absolute, depth + 1)
    }),
  )
  return [...imported, css].join('\n')
}

/** All the CSS of a theme, or null when a URL theme cannot be read. */
async function themeCss(source: CustomSource) {
  if (source.kind === 'file') return withImports(source.css, undefined)
  const urls = themeUrls(source)
  const texts = await Promise.all(urls.map(fetchCss))
  if (texts.includes(null)) return null
  const expanded = texts.map((text, i) => withImports(text!, urls[i]))
  return (await Promise.all(expanded)).join('\n')
}

async function fingerprint(text: string) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Works out the colors of custom themes that are new or changed; `remote` also redoes URL
 * themes, whose stylesheets can change at any time. Runs here so that it finishes even if
 * the popup that added a theme closes.
 */
async function updateColors(remote: boolean) {
  const { customThemes, extraCss, themeColors } = await loadSettings()
  const colors: Settings['themeColors'] = {}
  for (const { id, source } of customThemes) {
    const extra = extraCss[id] ?? ''
    const key = await fingerprint(JSON.stringify([source, extra]))
    const known = themeColors[id]
    if (known?.key === key && !(remote && source.kind === 'url')) {
      colors[id] = known
      continue
    }
    const css = await themeCss(source)
    if (css !== null) {
      const found = extractThemeColors(`${css}\n${extra}`)
      colors[id] = { key, colors: found.map((color) => color.hex) }
    } else if (known) colors[id] = known
  }
  if (JSON.stringify(colors) !== JSON.stringify(themeColors)) {
    await saveSettings({ themeColors: colors })
  }
}

let queue = Promise.resolve()
const enqueue = (remote: boolean) => {
  queue = queue
    .then(() => updateColors(remote))
    .catch((error) => console.error('pretty-enough-themes:', error))
}

chrome.runtime.onInstalled.addListener(() => enqueue(true))
chrome.runtime.onStartup.addListener(() => enqueue(true))
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('customThemes' in changes || 'extraCss' in changes)) enqueue(false)
})
