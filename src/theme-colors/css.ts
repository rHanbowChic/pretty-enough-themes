// A small CSS reader: just enough to list declarations with the selector and the conditions
// they apply under. It never throws: broken CSS gives fewer declarations.

export interface Declaration {
  selector: string
  property: string
  value: string
  /** The enclosing @media queries, lowercase. */
  media: string
}

/** At-rules whose content does not apply to the page as such. */
const SKIPPED = /^@(?:-\w+-)?(?:keyframes|font-face|page|counter-style|font-feature-values)\b/i

/** The index after the block that opens at `open`, skipping strings and comments' remains. */
function blockEnd(text: string, open: number) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === '"' || c === "'") i = stringEnd(text, i)
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i + 1
  }
  return text.length
}

function stringEnd(text: string, open: number) {
  for (let i = open + 1; i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === text[open]) return i
  }
  return text.length
}

function declaration(text: string, selector: string, media: string, out: Declaration[]) {
  const colon = text.indexOf(':')
  if (colon < 0) return
  const property = text.slice(0, colon).trim()
  const value = text
    .slice(colon + 1)
    .replace(/!\s*important\s*$/i, '')
    .trim()
  if (!property || !value) return
  out.push({
    selector,
    property: property.startsWith('--') ? property : property.toLowerCase(),
    value,
    media,
  })
}

function walk(text: string, selector: string, media: string, out: Declaration[]) {
  let start = 0
  let parens = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' || c === "'") i = stringEnd(text, i)
    else if (c === '(') parens++
    else if (c === ')') parens = Math.max(0, parens - 1)
    else if (parens) continue
    else if (c === ';') {
      if (selector) declaration(text.slice(start, i), selector, media, out)
      start = i + 1
    } else if (c === '}') start = i + 1
    else if (c === '{') {
      const prelude = text.slice(start, i).trim()
      const end = blockEnd(text, i)
      const inner = text.slice(i + 1, end - 1)
      if (/^@media\b/i.test(prelude)) {
        const query = prelude.slice(6).trim().toLowerCase()
        walk(inner, selector, media ? `${media} and ${query}` : query, out)
      } else if (prelude.startsWith('@')) {
        if (!SKIPPED.test(prelude)) walk(inner, selector, media, out)
      } else walk(inner, prelude, media, out)
      i = end - 1
      start = end
    }
  }
  if (selector) declaration(text.slice(start), selector, media, out)
}

export function parseDeclarations(css: string): Declaration[] {
  const out: Declaration[] = []
  walk(css.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, ' '), '', '', out)
  return out
}

/** Splits at top-level commas. */
export function splitList(text: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')') depth--
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}
