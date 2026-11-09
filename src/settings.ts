// Everything the extension stores, in chrome.storage.local (custom themes may hold whole
// CSS files, too large for storage.sync).

/** `site`: keep the site's own theme. `base`: only wikidot's base theme. */
export type ThemeId = 'site' | 'base' | string

export type CustomSource =
  | {
      kind: 'url'
      url: string
      /** Stylesheets loaded before `url`: a wikidot theme can extend other themes. */
      before?: string[]
    }
  | { kind: 'file'; fileName: string; css: string }

export interface CustomTheme {
  /** `custom:` followed by a random id. */
  id: string
  name: string
  source: CustomSource
}

/**
 * What to do with the site's top bar under a theme (see content/mobile-top-bar.ts). With no
 * choice, whether the theme mentions `.mobile-top-bar` decides.
 */
export type TopBarChoice = 'flatten' | 'keep'

export interface Settings {
  /** Theme for every site without its own choice. */
  theme: ThemeId
  /** Per-site choices, keyed by host name. */
  sites: Record<string, ThemeId>
  customThemes: CustomTheme[]
  /**
   * CSS added after a theme, keyed by theme id (`site` and `base` included), e.g. to set the
   * CSS variables of a community theme.
   */
  extraCss: Record<ThemeId, string>
  /** The user's choices, keyed by theme id. */
  topBar: Record<ThemeId, TopBarChoice>
  /**
   * Colors of custom themes, keyed by theme id. Only the background writes this, in a key of
   * its own: it must not overwrite edits saved while it works. `key` tells what they are for.
   */
  themeColors: Record<ThemeId, { key: string; colors: string[] }>
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'site',
  sites: {},
  customThemes: [],
  extraCss: {},
  topBar: {},
  themeColors: {},
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw }
}

export const loadSettings = () =>
  new Promise<Settings>((resolve) =>
    chrome.storage.local.get(null, (raw) => resolve(normalizeSettings(raw as Partial<Settings>))),
  )

export const saveSettings = (settings: Partial<Settings>) =>
  new Promise<void>((resolve) => chrome.storage.local.set(settings, () => resolve()))

/** `topBar` with the choice for theme `id` set; an empty choice means automatic. */
export function withTopBarChoice(
  topBar: Settings['topBar'],
  id: ThemeId,
  choice: TopBarChoice | '',
): Settings['topBar'] {
  const { [id]: _old, ...others } = topBar
  return choice ? { ...others, [id]: choice } : others
}

/** Every stylesheet of a URL theme, in loading order. */
export const themeUrls = (source: CustomSource & { kind: 'url' }) => [
  ...(source.before ?? []),
  source.url,
]

/** The theme that applies on `host`. */
export const themeFor = (settings: Settings, host: string): ThemeId =>
  settings.sites[host] ?? settings.theme
