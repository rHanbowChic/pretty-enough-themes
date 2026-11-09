// The extension's colors follow the system, in `@media (prefers-color-scheme: dark)`. Rather than
// copy them for a manual switch, the switch rewrites that media query, in every document.
export type Scheme = 'light' | 'dark'

let forced: Scheme | null = null
const documents = new Set<Document>()
const queries = new WeakMap<CSSMediaRule, string>()

function apply(doc: Document) {
  for (const sheet of doc.styleSheets) {
    for (const rule of sheet.cssRules) {
      // Not instanceof: rules of a frame come from another realm.
      if (rule.type !== CSSRule.MEDIA_RULE) continue
      const media = rule as CSSMediaRule
      const original = queries.get(media) ?? media.media.mediaText
      if (!original.includes('prefers-color-scheme')) continue
      queries.set(media, original)
      media.media.mediaText = !forced ? original : forced === 'dark' ? 'all' : 'not all'
    }
  }
}

/** Keeps `doc` on the chosen scheme from now on. */
export function keepScheme(doc: Document) {
  documents.add(doc)
  apply(doc)
}

export function forceScheme(scheme: Scheme) {
  forced = scheme
  for (const doc of documents) {
    // A frame that has since reloaded: its new document registers itself.
    if (doc.defaultView) apply(doc)
    else documents.delete(doc)
  }
}

export const currentScheme = (): Scheme =>
  forced ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
