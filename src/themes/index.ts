// Built-in themes, picked from the best rated on https://themes.wikidot.com/.
// The CSS files come from scripts/fetch-themes.mjs; keep its list in sync.
import maple from './maple.css?raw'
import midnightCoal from './midnight-coal.css?raw'
import monobook from './monobook.css?raw'

export interface BuiltinTheme {
  id: string
  name: string
  author: string
  /** Page on themes.wikidot.com. */
  page: string
  /** A few colors of the theme, shown as swatches in the popup. */
  colors: string[]
  css: string
}

const builtin = (
  id: string,
  name: string,
  author: string,
  colors: string[],
  css: string,
): BuiltinTheme => ({ id, name, author, page: `https://themes.wikidot.com/${id}`, colors, css })

export const BUILTIN_THEMES: BuiltinTheme[] = [
  builtin(
    'midnight-coal',
    'Midnight Coal',
    'pieterh',
    ['#000000', '#323232', '#545454'],
    midnightCoal,
  ),
  builtin('monobook', 'Monobook', 'Fereal', ['#f9f9f9', '#aaaaaa', '#002bb8'], monobook),
  builtin('maple', 'Maple', 'bcammo', ['#313537', '#fbfbfb', '#76ae45'], maple),
]

export const builtinTheme = (id: string) => BUILTIN_THEMES.find((theme) => theme.id === id)
