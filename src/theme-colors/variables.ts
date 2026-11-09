// CSS custom properties: finding their values, and what their names say.
import type { Role } from './roles'
import { parseColor } from './color'
import type { Declaration } from './css'

export type Variables = Map<string, string>

const GLOBAL = /^(?:html|:root|body|\*)$/i

/** The value of every variable. Global scopes win; among equals, the last declaration. */
export function collectVariables(declarations: Declaration[]): Variables {
  const variables: Variables = new Map()
  const fromGlobal = new Set<string>()
  for (const { selector, property, value, media } of declarations) {
    if (!property.startsWith('--')) continue
    const global = !media && selector.split(',').some((part) => GLOBAL.test(part.trim()))
    if (global || !fromGlobal.has(property)) variables.set(property, value)
    if (global) fromGlobal.add(property)
  }
  return variables
}

const VAR = /var\(\s*(--[\w-]+)\s*(?:,((?:[^()]|\([^()]*\))*))?\)/g

/** Replaces var() references, following chains and fallbacks. */
export function substitute(value: string, variables: Variables, depth = 0): string {
  if (depth > 8 || !value.includes('var(')) return value
  const replaced = value.replace(
    VAR,
    (_match, name: string, fallback?: string) => variables.get(name) ?? fallback?.trim() ?? '',
  )
  return substitute(replaced, variables, depth + 1)
}

/** A variable's value as a color; `12, 34, 56` is one too, made for `rgb(var(--x))`. */
export function variableColor(value: string) {
  const triplet = value.match(/^\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*$/)
  return parseColor(triplet ? `rgb(${triplet[1]}, ${triplet[2]}, ${triplet[3]})` : value)
}

/** Colors these names hold are about something else than the look of the theme. */
const IGNORED =
  /^(?:shadow|overlay|scrollbar|selection|tooltip|disabled|placeholder|error|danger|warning|warn|success|info|notice|code|syntax|rating|alert|focus|ring|logo)$/
const WEAKER = /^(?:hover|active|visited|border|divider|outline|muted|subtle|faint|\d+)$/

const NAME_ROLES: [RegExp, Role, number][] = [
  [/^(?:primary|brand|accent|theme|main|highlight)$/, 'primary', 40],
  [/^(?:background|backgrounds|bg|surface|canvas|page|body)$/, 'background', 42],
  [/^(?:secondary|tertiary)$/, 'secondary', 28],
  [/^(?:card|panel|box|paper|sidebar|block)$/, 'surface', 25],
  [/^(?:header|topbar|navbar|nav)$/, 'primary', 22],
  [/^(?:link|links)$/, 'primary', 15],
  [/^(?:text|foreground|fg|ink|font)$/, 'text', 15],
]

/** The role a variable's name suggests, with its weight. */
export function roleOfName(name: string): { role: Role; weight: number } | null {
  const words = name
    .replace(/^--/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[-_]+/)
  if (words.some((word) => IGNORED.test(word))) return null
  let best: { role: Role; weight: number } | null = null
  for (const word of words) {
    for (const [pattern, role, weight] of NAME_ROLES) {
      if (pattern.test(word) && weight > (best?.weight ?? 0)) best = { role, weight }
    }
  }
  if (best && words.some((word) => WEAKER.test(word))) best.weight *= 0.4
  return best
}
