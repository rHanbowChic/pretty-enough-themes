// The home page. Everything in the demo is the extension's own code on a fake browser; this
// file wires up the page around it.
import { setLocale, type Locale } from '../../src/i18n'
import { BUILTIN_THEMES } from '../../src/themes'
import { extractThemeColors, type ThemeColor } from '../../src/theme-colors'
import { h, rich } from '../../src/ui/dom'
import logo from '../../public/icons/logo.svg?url'
import './site.css'
import { Demo } from './demo'
import { LINKS, type LinkName } from './links'
import { currentScheme, forceScheme, keepScheme, type Scheme } from './scheme'
import { SITES } from './sites'
import { setTextLocale, text } from './text'

const LANG_KEY = 'pet-lang'
const SCHEME_KEY = 'pet-scheme'

/** Storage can be blocked; the choice then lasts until the page closes. */
const stored = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const on = (id: string, listener: () => void) => $(id).addEventListener('click', listener)

// Language: Chinese for zh-*, as in the extension, English for everything else.

const startLang = (stored(LANG_KEY) ?? navigator.language).toLowerCase().startsWith('zh')
let lang: Locale = startLang ? 'zh' : 'en'

/** The Chinese in the HTML, kept to switch back to. */
const chinese = new Map<HTMLElement, Node[]>()

function applyLocale() {
  setLocale(lang)
  setTextLocale(lang)
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  document.title = text.pageTitle
  for (const element of document.querySelectorAll<HTMLElement>('[data-en]')) {
    if (!chinese.has(element)) chinese.set(element, [...element.childNodes])
    const nodes = lang === 'zh' ? chinese.get(element)! : rich(element.dataset.en!)
    element.replaceChildren(
      ...nodes.map((node) => (node instanceof Node ? node.cloneNode(true) : node)),
    )
  }
  $('lang-label').textContent = lang === 'zh' ? 'English' : '中文'
  renderLinks()
  renderActions()
  renderColors()
}

// Reserved links.

function renderLinks() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-link]')) {
    const url = LINKS[link.dataset.link as LinkName]
    link.toggleAttribute('aria-disabled', !url)
    if (url) {
      link.href = url
      link.removeAttribute('title')
    } else {
      link.setAttribute('aria-disabled', 'true')
      link.title = text.soon
    }
  }
}

// Scheme.

function renderScheme() {
  const dark = currentScheme() === 'dark'
  const button = $('scheme')
  button.title = dark ? text.toLight : text.toDark
  button.setAttribute('aria-label', button.title)
}

on('scheme', () => {
  const scheme = currentScheme() === 'dark' ? 'light' : 'dark'
  forceScheme(scheme)
  store(SCHEME_KEY, scheme)
  renderScheme()
})

on('lang', () => {
  lang = lang === 'zh' ? 'en' : 'zh'
  store(LANG_KEY, lang)
  applyLocale()
  renderScheme()
  demo.reload(lang)
})

// The demo.

const demo = new Demo(lang)
window.demo = demo

/** CSS for the "extra CSS" button: enough to see, on any theme. */
const EXTRA_CSS = `#page-title {
  border-bottom: 4px solid #e8590c;
}
#page-content a {
  color: #e8590c;
}`

const CYCLE = [...BUILTIN_THEMES.map((theme) => theme.id), 'base', 'site']
const TOP_BAR_THEME = BUILTIN_THEMES[0].id

function renderActions() {
  $('try-top-bar').textContent = demo.isTopBarKept(TOP_BAR_THEME) ? text.hideKept : text.showKept
  $('try-extra').textContent = demo.hasExtra(EXTRA_CSS) ? text.removeExtra : text.addExtra
}

on('try-switch', () => demo.nextTheme(CYCLE))
on('try-site', () => demo.perSite(SITES[1].host, 'maple'))
on('try-custom', () => demo.settingsPage())
on('try-add', () => demo.addSiteTheme())
on('try-extra', () => demo.toggleExtra(EXTRA_CSS))
on('try-top-bar', () => demo.toggleTopBar(TOP_BAR_THEME))
on('try-source', () => demo.showSource())

// Color extraction.

const colorInput = $<HTMLTextAreaElement>('color-css')
const roleNames: Record<ThemeColor['role'], keyof typeof text> = {
  background: 'roleBackground',
  surface: 'roleSurface',
  primary: 'rolePrimary',
  secondary: 'roleSecondary',
  text: 'roleText',
  other: 'roleOther',
}

function renderColors() {
  const colors = extractThemeColors(colorInput.value)
  $<HTMLButtonElement>('color-add').disabled = !colorInput.value.trim()
  $('color-result').replaceChildren(
    ...(colors.length
      ? colors.map(({ hex, role }) => {
          const swatch = h('span', { class: 'color-swatch' })
          swatch.style.background = hex
          return h(
            'div',
            { class: 'color' },
            swatch,
            h('span', { class: 'color-role' }, text[roleNames[role]]),
            h('code', {}, hex),
          )
        })
      : [h('p', { class: 'description' }, text.nothingFound)]),
  )
}

colorInput.addEventListener('input', renderColors)
on('color-add', () => demo.addTheme(text.pastedTheme, colorInput.value))

function renderPresets() {
  const presets = BUILTIN_THEMES.map((theme) => {
    const button = h('button', { type: 'button' }, theme.name)
    button.addEventListener('click', () => {
      colorInput.value = theme.css
      renderColors()
    })
    return button
  })
  $('color-presets').replaceChildren(...presets)
}

// Start.

renderPresets()
colorInput.value = BUILTIN_THEMES[2].css
keepScheme(document)
const scheme = stored(SCHEME_KEY)
if (scheme === 'light' || scheme === 'dark') forceScheme(scheme as Scheme)
for (const image of document.querySelectorAll<HTMLImageElement>('img[data-logo]')) image.src = logo

// The primary download is the one for this browser.
if (/firefox/i.test(navigator.userAgent)) {
  document
    .querySelectorAll('[data-link="firefox"]')
    .forEach((link) => link.classList.add('primary'))
  document
    .querySelectorAll('[data-link="chrome"]')
    .forEach((link) => link.classList.remove('primary'))
}

applyLocale()
renderScheme()
demo.onChange = renderActions
window.chrome = demo.extension.api(null)
await import('../../src/background')
demo.start()
document.documentElement.classList.remove('pending')
