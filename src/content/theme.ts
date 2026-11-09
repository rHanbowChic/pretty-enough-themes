// Replaces the site's theme. Runs at document_start in the isolated world, on every site:
// wikidot sites can have any domain, and only the page tells.
//
// Wikidot puts every stylesheet of the theme into one element:
//
//   <style id="internal-style">
//     /* modules */  @import url(…/common--modules/css/…);   (per page, kept)
//     /* theme */    @import url(…/common--theme/base/css/style.css);   (kept)
//                    @import url(<whatever the admin chose>);   (removed)
//   </style>
//
// The chosen theme goes into a <style> right after it, so the page's own [[module CSS]]
// blocks (later in <head>) still come after the theme, as they do with the site's theme.
// After it comes the user's extra CSS for the theme, in its own <style>. Themes that do not
// know `.mobile-top-bar` get a plain top bar (see mobile-top-bar.ts).
import { MESSAGE_PAGE_INFO, type PageInfo } from '../messages'
import { loadSettings, themeFor, themeUrls, type Settings } from '../settings'
import { builtinTheme } from '../themes'
import { flattenTopBar, mentionsMobileTopBar } from './mobile-top-bar'

const IMPORT = /@import\s+url\(\s*(['"]?)([^'")]*)\1\s*\)\s*;?/g
const isKept = (url: string) =>
  url.includes('/common--theme/base/css/') || url.includes('/common--modules/')

const STYLE_ID = 'pretty-enough-theme'
const EXTRA_ID = 'pretty-enough-theme-extra'

declare global {
  interface Window {
    /** Set once this script runs, so a second injection (from the popup) does nothing. */
    prettyEnoughThemes?: true
  }
}

if (!window.prettyEnoughThemes) {
  window.prettyEnoughThemes = true
  main()
}

function main() {
  let settings: Settings | undefined
  let internal: HTMLStyleElement | undefined
  /** The element's text as the site sent it. */
  let original = ''

  const load = () =>
    loadSettings().then((loaded) => {
      settings = loaded
      apply()
    })

  // Wait until the parser has finished the element (it has moved on to a later node), so
  // its text is complete before it is read.
  const find = () => {
    // Read the site's text only once: later the element holds what apply() wrote.
    if (internal) return true
    const style = document.getElementById('internal-style')
    if (!(style instanceof HTMLStyleElement)) return false
    if (!style.nextSibling && document.readyState === 'loading') return false
    internal = style
    original = style.textContent ?? ''
    // Only now: settings can hold whole stylesheets, not to be read on every page of the web.
    if (isWikidot(original)) {
      load()
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === 'local') load()
      })
    }
    return true
  }
  if (!find()) {
    const observer = new MutationObserver(() => find() && observer.disconnect())
    observer.observe(document, { childList: true, subtree: true })
    document.addEventListener('DOMContentLoaded', () => {
      observer.disconnect()
      find()
    })
  }

  /** The CSS the top bar is being worked out for (mobile-top-bar.ts). */
  let topBarFor: string | null = null

  function apply() {
    if (!settings || !internal || !isWikidot(original)) return
    const id = themeFor(settings, location.hostname)
    const css = themeCss(settings, id)
    // A deleted theme falls back to the site's, extra CSS included.
    const extra = settings.extraCss[css === null ? 'site' : id] ?? ''

    if (css === null) {
      if (internal.textContent !== original) internal.textContent = original
    } else {
      const stripped = original.replace(IMPORT, (rule, _q, url: string) =>
        isKept(url) ? rule : '',
      )
      if (internal.textContent !== stripped) internal.textContent = stripped
    }

    // The user's choice decides; else the theme's text, or nothing for the site's theme.
    const choice = css === null ? undefined : settings.topBar[id]
    const key = css === null ? null : `${choice}\n${css}\n${extra}`
    if (key !== topBarFor) {
      topBarFor = key
      // Flatten until the answer is known: two bars flashing is the likelier glitch. When
      // some stylesheet cannot be read, leave the bar to the theme.
      flattenTopBar(css !== null && choice !== 'keep')
      if (css !== null && !choice) {
        mentionsMobileTopBar(`${css}\n${extra}`, location.href).then((mentions) => {
          if (topBarFor === key) flattenTopBar(mentions === false)
        })
      }
    }

    // internal-style, then the theme and the extra CSS, each only when needed.
    let anchor: Element = internal
    for (const [elementId, text, wanted] of [
      [STYLE_ID, css ?? '', css !== null],
      [EXTRA_ID, extra, extra.trim() !== ''],
    ] as const) {
      let element = document.getElementById(elementId)
      if (!wanted) {
        element?.remove()
        continue
      }
      if (!element) {
        element = document.createElement('style')
        element.id = elementId
      }
      if (element.textContent !== text) element.textContent = text
      if (anchor.nextSibling !== element) anchor.after(element)
      anchor = element
    }
  }

  /** CSS of the chosen theme; '' for the base theme alone, null to keep the site's theme. */
  function themeCss(settings: Settings, id: string): string | null {
    if (id === 'base') return ''
    const builtin = builtinTheme(id)
    if (builtin) return builtin.css
    const custom = settings.customThemes.find((theme) => theme.id === id)
    if (!custom) return null
    if (custom.source.kind === 'file') return custom.source.css
    return themeUrls(custom.source)
      .map((url) => `@import url(${JSON.stringify(url)});`)
      .join('\n')
  }

  // For the popup: whether this is a wikidot page, and which theme the site uses.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message !== MESSAGE_PAGE_INFO) return
    sendResponse(pageInfo(internal ? original : null))
  })
}

function isWikidot(text: string) {
  return [...text.matchAll(IMPORT)].some((match) => match[2].includes('/common--theme/base/css/'))
}

function pageInfo(text: string | null): PageInfo {
  if (text === null || !isWikidot(text)) return { wikidot: false, siteThemes: [] }
  const siteThemes = [...text.matchAll(IMPORT)]
    .map((match) => match[2])
    .filter((url) => !isKept(url))
    .flatMap((url) => {
      try {
        return [new URL(url, document.baseURI).href]
      } catch {
        return []
      }
    })
  return { wikidot: true, siteThemes }
}
