import type { Demo } from '../src/demo'

declare global {
  interface Window {
    /** Set by the home page: the frames of the demo all share one fake extension. */
    demo?: Demo
  }
}

/** Gives this frame the extension APIs. Call before importing any extension code. */
export function connect() {
  const demo = window.parent === window ? undefined : window.parent.demo
  if (!demo) {
    location.replace('../index.html')
    throw new Error('This page only works inside the demo.')
  }
  const tabId = Number((window.frameElement as HTMLElement).dataset.tab) || undefined
  globalThis.chrome = demo.extension.api(window, tabId)
  return { demo, tabId }
}

/** The body of one of the extension's own pages. Its text and logic come from src/. */
export function mountPage(html: string, logo: string) {
  const page = new DOMParser().parseFromString(html, 'text/html')
  page.querySelectorAll('script').forEach((script) => script.remove())
  page.querySelectorAll('img').forEach((image) => (image.src = logo))
  document.body.replaceChildren(...page.body.childNodes)
}
