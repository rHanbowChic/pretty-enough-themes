// The browser around the demo: its tabs, viewport, popup and page-source panel. The extension
// itself runs unchanged in the iframes (see extension.ts and ../frames/).
import { h, rich } from '../../src/ui/dom'
import type { Locale } from '../../src/i18n'
import { themeFor, withTopBarChoice, type Settings, type ThemeId } from '../../src/settings'
import { FakeExtension, type Tab } from './extension'
import { keepScheme } from './scheme'
import { SITES, type DemoSite } from './sites'
import { say, text } from './text'

/** Width the pages are laid out at; they are scaled down to fit. */
const VIEWPORTS = { desktop: 1040, phone: 390 }
type Viewport = keyof typeof VIEWPORTS

const OPTIONS_TAB = 100

const IMPORT = /@import url\(([^)]+)\);/g

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

export class Demo {
  readonly extension = new FakeExtension()
  lang: Locale
  private active = 1
  private viewport: Viewport = 'desktop'
  private frames = new Map<number, HTMLIFrameElement>()
  private optionsOpen = false
  private popupLoaded: (() => void) | null = null
  private observer: MutationObserver | null = null
  /** Called when anything the page shows may have changed. */
  onChange = () => {}

  constructor(lang: Locale) {
    this.lang = lang
    this.extension.lang = () => this.lang
    this.extension.tab = (id) => this.tabs().find((tab) => tab.id === id)
    this.extension.activeTab = () => this.tabs().find((tab) => tab.id === this.active)!
    this.extension.openOptions = () => this.openOptions()
  }

  /** Starts everything. The background must be running by now. */
  start() {
    this.extension.subscribe(() => this.onChange())
    new ResizeObserver(() => this.layout()).observe($('viewport'))
    $('toggle-source').addEventListener('click', () => this.toggleSource())
    $('demo-reset').addEventListener('click', () => this.reset())
    for (const input of document.querySelectorAll<HTMLInputElement>('[name="viewport"]')) {
      input.addEventListener('change', () => {
        this.viewport = input.value as Viewport
        this.layout()
      })
    }
    // A wide page does not fit on a phone: start with one that does.
    if (innerWidth < 700) {
      this.viewport = 'phone'
      document.querySelector<HTMLInputElement>('[name="viewport"][value="phone"]')!.checked = true
    }
    this.loadPages()
  }

  private tabs(): Tab[] {
    const pages = SITES.map((site, index) => ({
      id: index + 1,
      url: `https://${site.host}${site.path}`,
      host: site.host,
    }))
    const options = { id: OPTIONS_TAB, url: 'chrome-extension://demo/options.html', host: null }
    return this.optionsOpen ? [...pages, options] : pages
  }

  private site(id = this.active): DemoSite | null {
    return SITES[id - 1] ?? null
  }

  /** (Re)loads every frame: at the start and when the language changes. */
  private loadPages() {
    const viewport = $('viewport')
    viewport.replaceChildren()
    this.frames.clear()
    for (const tab of this.tabs()) {
      this.extension.forgetTab(tab.id)
      const site = this.site(tab.id)
      const frame = h('iframe', {
        src: site ? `./frames/page.html?site=${site.id}` : './frames/options.html',
        title: site ? site.name[this.lang] : text.settingsTab,
      })
      frame.dataset.tab = String(tab.id)
      this.frames.set(tab.id, frame)
      viewport.append(frame)
    }
    this.show(this.frames.has(this.active) ? this.active : 1)
  }

  reload(lang: Locale) {
    this.lang = lang
    this.loadPages()
  }

  /** Called by each frame when the extension's code in it has run. */
  frameReady(kind: 'page' | 'popup' | 'options', doc: Document, tabId?: number) {
    keepScheme(doc)
    if (kind === 'page') {
      this.extension.markTabReady(tabId!)
      if (tabId === this.active) this.watchPage()
    }
    if (kind === 'popup') {
      const frame = $<HTMLIFrameElement>('popup')
      new ResizeObserver(() => {
        frame.style.height = `${doc.body.offsetHeight}px`
      }).observe(doc.body)
      this.popupLoaded?.()
    }
  }

  /** Shows tab `id`, and opens the popup anew, as clicking the toolbar icon would. */
  private show(id: number) {
    this.active = id
    for (const [tab, frame] of this.frames) frame.hidden = tab !== id
    this.renderTabs()
    this.layout()
    this.watchPage()
    return this.loadPopup()
  }

  private loadPopup() {
    return new Promise<void>((resolve) => {
      this.popupLoaded = resolve
      const frame = $<HTMLIFrameElement>('popup')
      const url = './frames/popup.html'
      if (frame.getAttribute('src')) frame.contentWindow!.location.reload()
      else frame.src = url
    })
  }

  private renderTabs() {
    const close = h('span', { class: 'tab-close', title: text.close }, '×')
    close.addEventListener('click', (event) => {
      event.stopPropagation()
      this.closeOptions()
    })
    $('tabs').replaceChildren(
      ...this.tabs().map((tab) => {
        const site = this.site(tab.id)
        const button = h(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: 'tab',
            ariaSelected: String(tab.id === this.active),
          },
          h('span', { class: 'tab-title' }, site ? site.name[this.lang] : text.settingsTab),
          !site && close,
        )
        button.addEventListener('click', () => this.show(tab.id))
        return button
      }),
    )
    $('address').textContent = this.extension.activeTab().url
    const isPage = this.site() !== null
    $('page-tools').hidden = !isPage
    if (!isPage) this.setSource(false)
  }

  private layout() {
    const viewport = $('viewport')
    const frame = this.frames.get(this.active)
    if (!frame) return
    if (!this.site()) {
      frame.removeAttribute('style')
      return
    }
    const width = VIEWPORTS[this.viewport]
    const scale = Math.min(1, viewport.clientWidth / width)
    frame.style.width = `${width}px`
    frame.style.height = `${viewport.clientHeight / scale}px`
    frame.style.transform = `scale(${scale})`
    // Centered: a phone-sized page sits in the middle of the viewport.
    frame.style.left = `${(viewport.clientWidth - width * scale) / 2}px`
  }

  private openOptions() {
    if (!this.optionsOpen) {
      this.optionsOpen = true
      const frame = h('iframe', { src: './frames/options.html', title: text.settingsTab })
      frame.dataset.tab = String(OPTIONS_TAB)
      this.frames.set(OPTIONS_TAB, frame)
      $('viewport').append(frame)
    }
    return this.show(OPTIONS_TAB)
  }

  private closeOptions() {
    this.frames.get(OPTIONS_TAB)?.remove()
    this.frames.delete(OPTIONS_TAB)
    this.optionsOpen = false
    this.show(1)
  }

  /** Back to how the demo started. */
  reset() {
    if (this.optionsOpen) this.closeOptions()
    this.extension.clear()
    this.loadPopup()
  }

  // Page-source panel

  private toggleSource() {
    this.setSource($('source').hidden)
  }

  setSource(open: boolean) {
    $('source').hidden = !open
    $('toggle-source').setAttribute('aria-pressed', String(open))
    if (open) this.renderSource()
    this.layout()
  }

  private pageDocument() {
    return this.site() ? (this.frames.get(this.active)?.contentDocument ?? null) : null
  }

  /** Follows the changes the content script makes to the shown page. */
  private watchPage() {
    this.observer?.disconnect()
    const doc = this.pageDocument()
    if (!doc?.documentElement) return
    this.observer = new MutationObserver(() => this.renderSource())
    this.observer.observe(doc.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    this.renderSource()
  }

  private renderSource() {
    const panel = $('source-lines')
    const doc = this.pageDocument()
    const site = this.site()
    if ($('source').hidden || !doc || !site) return
    const internal = doc.getElementById('internal-style')?.textContent
    if (internal === undefined) return

    const line = (kind: 'same' | 'added' | 'removed', code: string, note = '') =>
      h(
        'div',
        { class: `line ${kind}` },
        h('span', { class: 'sign' }, { same: ' ', added: '+', removed: '−' }[kind]),
        h('code', {}, code),
        note && h('span', { class: 'note' }, ...rich(note)),
      )

    const lines = [line('same', '<style id="internal-style">')]
    for (const [, url] of site.internalStyle.matchAll(IMPORT)) {
      const kept = internal.includes(url)
      lines.push(
        line(
          kept ? 'same' : 'removed',
          `  @import url(${url.replace(/^https:\/\/[^/]+\/v--[^/]+\//, '…/')});`,
          kept ? '' : text.sourceRemoved,
        ),
      )
    }
    lines.push(line('same', '</style>'))

    for (const [id, note] of [
      ['pretty-enough-theme', text.sourceTheme],
      ['pretty-enough-theme-extra', text.sourceExtra],
    ]) {
      const style = doc.getElementById(id)
      if (!style) continue
      const count = (style.textContent ?? '').split('\n').length
      lines.push(line('added', `<style id="${id}">…</style>`, say(note, { count: `${count}` })))
    }

    const flattened = site.topBar('') !== '' && !doc.querySelector('#top-bar .top-bar')
    if (flattened) lines.push(line('added', '#top-bar > ul', text.sourceFlattened))
    panel.replaceChildren(...lines)
  }

  // Shortcuts for the buttons on the page

  private settings(): Settings {
    return {
      theme: 'site',
      sites: {},
      customThemes: [],
      extraCss: {},
      topBar: {},
      themeColors: {},
      ...this.extension.read(),
    }
  }

  /** The theme shown in tab `id`, default the current one. */
  private themeOf(host: string) {
    return themeFor(this.settings(), host)
  }

  private currentHost() {
    return this.site()?.host ?? SITES[0].host
  }

  /** Makes sure a wiki page is showing, without reopening the popup needlessly. */
  private async showPage(id?: number) {
    const wanted = id ?? (this.site() ? this.active : 1)
    if (wanted !== this.active) await this.show(wanted)
  }

  private focus() {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    $('demo').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }

  /** Writes `id` where the popup would: to the site's own choice, if it has one. */
  private choose(id: ThemeId) {
    const { sites } = this.settings()
    const host = this.currentHost()
    if (host in sites) this.extension.write({ sites: { ...sites, [host]: id } })
    else this.extension.write({ theme: id })
  }

  async nextTheme(order: ThemeId[]) {
    await this.showPage()
    this.focus()
    const index = order.indexOf(this.themeOf(this.currentHost()))
    this.choose(order[(index + 1) % order.length])
    await this.loadPopup()
  }

  async perSite(host: string, theme: ThemeId) {
    await this.showPage(SITES.findIndex((site) => site.host === host) + 1)
    this.focus()
    const { sites } = this.settings()
    this.extension.write({ sites: { ...sites, [host]: theme } })
    await this.loadPopup()
  }

  async settingsPage() {
    this.focus()
    await this.openOptions()
  }

  /** Presses the popup's real + button. */
  async addSiteTheme() {
    await this.showPage()
    this.focus()
    $<HTMLIFrameElement>('popup').contentDocument?.getElementById('add-site')?.click()
  }

  async toggleExtra(css: string) {
    await this.showPage()
    this.focus()
    const { extraCss } = this.settings()
    const id = this.themeOf(this.currentHost())
    const { [id]: current, ...others } = extraCss
    this.extension.write({ extraCss: current === css ? others : { ...others, [id]: css } })
    this.setSource(true)
    await this.loadPopup()
  }

  hasExtra(css: string) {
    return this.settings().extraCss[this.themeOf(this.currentHost())] === css
  }

  /** The top bar as a theme leaves it, without the extension's help, and back. */
  async toggleTopBar(theme: ThemeId) {
    await this.showPage(1)
    this.focus()
    const { sites, topBar } = this.settings()
    const host = SITES[0].host
    const { [host]: _own, ...others } = sites
    const keep = topBar[theme] === 'keep'
    this.extension.write({
      theme,
      sites: others,
      topBar: withTopBarChoice(topBar, theme, keep ? '' : 'keep'),
    })
    await this.loadPopup()
  }

  isTopBarKept(theme: ThemeId) {
    return this.settings().topBar[theme] === 'keep'
  }

  /** Adds CSS as a theme from a file, and uses it. */
  async addTheme(name: string, css: string) {
    await this.showPage()
    this.focus()
    const id = `custom:${crypto.randomUUID()}`
    const { customThemes } = this.settings()
    this.extension.write({
      customThemes: [
        ...customThemes,
        { id, name, source: { kind: 'file', fileName: `${name}.css`, css } },
      ],
    })
    this.choose(id)
    await this.loadPopup()
  }

  showSource() {
    this.showPage().then(() => {
      this.focus()
      this.setSource(true)
    })
  }
}
