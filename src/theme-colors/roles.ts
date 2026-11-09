// What a declaration says about the color it holds: which part of the page it paints.
import { splitList, type Declaration } from './css'

export type Role = 'background' | 'surface' | 'primary' | 'secondary' | 'text' | 'other'

export interface Use {
  role: Role
  weight: number
}

type Rule = [selector: RegExp, role: Role, weight: number]

// Wikidot's page skeleton, which every theme styles:
//
//   body > #container-wrap-wrap > #container-wrap > #container
//     #header (h1, h2, #top-bar)
//     #content-wrap
//       #side-bar (.side-block)
//       #main-content (#page-title, #page-content)
//     #footer
//
// Selectors are compared normalized (see normalize()); the first match counts.
const PAGE = '(?:html|:root|body|#container-wrap-wrap|#container-wrap|#container)'
const CONTENT = '(?:#content-wrap|#main-content|#page-content)'

const BACKGROUNDS: Rule[] = [
  [RegExp(`^${PAGE}$`), 'background', 36],
  [RegExp(`^${CONTENT}$`), 'surface', 26],
  [/^(?:#header|#top-bar|#footer)$/, 'primary', 24],
  [/^#top-bar\b/, 'primary', 10],
  [/^#side-bar$/, 'surface', 18],
  [/^(?:#side-bar )?\.side-block$/, 'surface', 14],
  [/^#side-bar\b/, 'secondary', 3],
  [/^#page-title$/, 'primary', 8],
]

const TEXT_COLORS: Rule[] = [
  [RegExp(`^(?:${PAGE}|${CONTENT})$`), 'text', 16],
  [RegExp(`^(?:${PAGE} |${CONTENT} )?a$`), 'primary', 14],
  [/^(?:#page-title|h[1-3]|#(?:main-content|page-content) h[1-3])$/, 'primary', 10],
  [/^#header\b/, 'primary', 6],
  [/^#side-bar\b.*\ba$/, 'primary', 6],
  [/^#top-bar\b/, 'secondary', 6],
]

const BORDERS: Rule[] = [
  [/^(?:#page-title|#header|#top-bar|#footer|#side-bar|\.side-block)$/, 'secondary', 5],
]

/** `div#header > ul li:hover` → `#header ul li`. */
function normalize(selector: string) {
  return selector
    .toLowerCase()
    .replace(/::?[\w-]+(?:\([^()]*\))?/g, (pseudo) => (pseudo === ':root' ? pseudo : ''))
    .replace(/\b[a-z][a-z0-9]*(?=[#.])/g, '')
    .replace(/\s*[>+~]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const INTERACTIVE = /:(?:hover|focus|active|visited|focus-within|focus-visible)\b/i

/** How the conditions around a declaration count. */
function conditions(media: string) {
  if (media.includes('print')) return 0
  if (/prefers-color-scheme:\s*dark|prefers-contrast/.test(media)) return 0.3
  return media ? 0.5 : 1
}

const match = (rules: Rule[], selector: string): Use | null => {
  const rule = rules.find(([pattern]) => pattern.test(selector))
  return rule ? { role: rule[1], weight: rule[2] } : null
}

function useOf(selector: string, property: string): Use | null {
  const target = normalize(selector)
  if (/^background(?:-color|-image)?$/.test(property)) {
    return match(BACKGROUNDS, target) ?? { role: 'other', weight: 1.5 }
  }
  if (property === 'color') return match(TEXT_COLORS, target) ?? { role: 'other', weight: 1 }
  if (/^border(?:-[a-z]+)*$/.test(property) && !/width|style|radius|image|spacing/.test(property)) {
    return match(BORDERS, target) ?? { role: 'other', weight: 0.5 }
  }
  if (property === 'fill' || property === 'stroke') return { role: 'other', weight: 0.5 }
  return null
}

/** The strongest use among the selectors of a rule. */
export function classify({ selector, property, media }: Declaration): Use | null {
  const factor = conditions(media)
  if (!factor) return null
  let best: Use | null = null
  for (const part of splitList(selector)) {
    const use = useOf(part, property)
    if (!use) continue
    const weight = use.weight * factor * (INTERACTIVE.test(part) ? 0.25 : 1)
    if (weight > (best?.weight ?? 0)) best = { role: use.role, weight }
  }
  return best
}
