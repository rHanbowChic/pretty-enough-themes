import { setLocale, tr, uiLocale } from '../i18n'
import { MESSAGES, type MessageKey } from './messages'

/** Sets the UI language and fills every `data-i18n` element. */
export function localize() {
  const locale = uiLocale()
  setLocale(locale)
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    element.replaceChildren(...rich(msg(element.dataset.i18n as MessageKey)))
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]')) {
    element.setAttribute('placeholder', msg(element.dataset.i18nPlaceholder as MessageKey))
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const text = msg(element.dataset.i18nTitle as MessageKey)
    element.title = text
    element.setAttribute('aria-label', text)
  }
}

/** A message in the UI language, with `{name}` placeholders filled from `values`. */
export function msg(key: MessageKey, values: Record<string, string> = {}) {
  return tr(MESSAGES[key]).replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}

/** `code` and **bold** become <code> and <strong>. */
export function rich(text: string): (string | Node)[] {
  return text.split(/(`[^`]*`|\*\*[^*]*\*\*)/).map((part) => {
    const tag = part.startsWith('`') ? 'code' : part.startsWith('**') ? 'strong' : null
    if (!tag) return part
    const node = document.createElement(tag)
    node.textContent = part.slice(tag === 'code' ? 1 : 2, tag === 'code' ? -1 : -2)
    return node
  })
}

/** A few colors of a theme. */
export function swatches(colors: string[]) {
  const element = h('span', { class: 'swatches' })
  for (const color of colors) {
    const swatch = h('span')
    swatch.style.background = color
    element.append(swatch)
  }
  return element
}

/** document.createElement with properties and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (string | Node | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  const { class: className, ...rest } = props
  if (className) element.className = className
  Object.assign(element, rest)
  element.append(...children.filter((child): child is string | Node => !!child))
  return element
}
