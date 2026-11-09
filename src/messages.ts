/** Popup → content script: asks for the page's PageInfo. */
export const MESSAGE_PAGE_INFO = 'pretty-enough-themes:page-info'

export interface PageInfo {
  /** The page has wikidot's theme <style>. */
  wikidot: boolean
  /** Addresses of the theme stylesheets the site chose (everything after the base theme). */
  siteThemes: string[]
}

/** Content script → background: fetch a stylesheet; answers its text, or null. */
export const MESSAGE_FETCH_CSS = 'pretty-enough-themes:fetch-css'

export interface FetchCssMessage {
  type: typeof MESSAGE_FETCH_CSS
  url: string
}
