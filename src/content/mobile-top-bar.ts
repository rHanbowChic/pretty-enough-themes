// Many community sites follow the SCP Foundation's theme in nav:top, which wraps the menu:
//
//   <div id="top-bar">
//     <div class="top-bar"><ul>…</ul></div>
//     <div class="mobile-top-bar">…</div>
//   </div>
//
// Older themes, like those on themes.wikidot.com, expect wikidot's plain `#top-bar > ul`: they
// know nothing of the wrappers, show both menus, and their flex layouts break. So unless the
// chosen theme mentions `.mobile-top-bar`, itself or in the stylesheets it @imports, the
// contents of `.top-bar` replace those of `#top-bar`. The mention is only a guess (an old
// theme can be built on a newer one), so the user's choice for the theme comes first.
import { importedUrls } from '../imports'
import { MESSAGE_FETCH_CSS, type FetchCssMessage } from '../messages'

/** `.top-bar` only: `#top-bar` itself may carry the class. */
const WRAPPER = '.top-bar:not(#top-bar)'

/** How deep @imports are followed. */
const MAX_DEPTH = 3

let wanted = false
/** Puts everything back; set while the bar is flattened. */
let restore: (() => void) | null = null
let watching = false

/** Flattens the top bar, now or as soon as it is parsed, or puts it back. */
export function flattenTopBar(flatten: boolean) {
  wanted = flatten
  if (!watching && document.readyState === 'loading') {
    watching = true
    const observer = new MutationObserver(sync)
    observer.observe(document, { childList: true, subtree: true })
    document.addEventListener('DOMContentLoaded', () => {
      observer.disconnect()
      sync()
    })
  }
  sync()
}

function sync() {
  if (!wanted) {
    restore?.()
    restore = null
    return
  }
  if (restore) return
  const bar = document.getElementById('top-bar')
  if (!bar) return
  // While the page loads, wait until the parser has moved on from the bar, and take a wrapper
  // elsewhere in the page only once all of it is there.
  const loading = document.readyState === 'loading'
  if (loading && !bar.nextSibling) return
  const wrapper = bar.querySelector(WRAPPER) ?? (loading ? null : document.querySelector(WRAPPER))
  if (!wrapper) return

  const barNodes = [...bar.childNodes]
  const wrapperNodes = [...wrapper.childNodes]
  bar.replaceChildren(...wrapperNodes)
  restore = () => {
    wrapper.replaceChildren(...wrapperNodes)
    bar.replaceChildren(...barNodes)
  }
}

const cache = new Map<string, Promise<boolean | null>>()

/**
 * Whether `css` (served from `base`) mentions `.mobile-top-bar`: true or false, or null when
 * an imported stylesheet could not be read.
 */
export function mentionsMobileTopBar(css: string, base: string): Promise<boolean | null> {
  const key = `${base}\n${css}`
  let result = cache.get(key)
  if (!result) {
    result = check(css, base, 0)
    cache.set(key, result)
  }
  return result
}

async function check(css: string, base: string, depth: number): Promise<boolean | null> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  if (text.includes('mobile-top-bar')) return true
  if (depth >= MAX_DEPTH) return false
  const urls = importedUrls(text)
  const results = await Promise.all(
    urls.map(async (url): Promise<boolean | null> => {
      let absolute: string
      try {
        absolute = new URL(url, base).href
      } catch {
        return false
      }
      const imported = await fetchCss(absolute)
      return imported === null ? null : check(imported, absolute, depth + 1)
    }),
  )
  if (results.includes(true)) return true
  return results.includes(null) ? null : false
}

const fetched = new Map<string, Promise<string | null>>()

/**
 * Fetched by the background: it has host permissions, so CORS does not get in the way.
 * Cached, since editing extra CSS re-checks the theme on every save.
 */
function fetchCss(url: string): Promise<string | null> {
  let text = fetched.get(url)
  if (!text) {
    text = fetchUncached(url)
    fetched.set(url, text)
  }
  return text
}

function fetchUncached(url: string): Promise<string | null> {
  const message: FetchCssMessage = { type: MESSAGE_FETCH_CSS, url }
  return chrome.runtime
    .sendMessage(message)
    .then((text: unknown) => (typeof text === 'string' ? text : null))
    .catch(() => null)
}
