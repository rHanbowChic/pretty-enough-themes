import { MESSAGE_PAGE_INFO, type PageInfo } from '../messages'
import {
  loadSettings,
  saveSettings,
  themeFor,
  themeUrls,
  withTopBarChoice,
  type CustomTheme,
  type Settings,
  type ThemeId,
  type TopBarChoice,
} from '../settings'
import { BUILTIN_THEMES } from '../themes'
import { h, localize, msg, rich, swatches } from '../ui/dom'
import './index.css'

localize()

type PageState =
  /** Not a web page (new tab, browser pages). */
  | { kind: 'none' }
  | { kind: 'other'; host: string }
  /** The user took away the access to all sites. */
  | { kind: 'permission' }
  | { kind: 'ready'; host: string; info: PageInfo }

/** The manifest's host permission. */
const ALL_SITES = { origins: ['*://*/*'] }

const notice = document.getElementById('notice')!
const scope = document.getElementById('scope') as HTMLFieldSetElement
const themes = document.getElementById('themes')!
const addSite = document.getElementById('add-site') as HTMLButtonElement
const topBarField = document.getElementById('top-bar-field')!
const topBarChoice = document.getElementById('top-bar-choice') as HTMLSelectElement

const openSettings = () => {
  chrome.runtime.openOptionsPage()
  window.close()
}
document.getElementById('open-settings')!.addEventListener('click', openSettings)
document.getElementById('manage')!.addEventListener('click', (event) => {
  event.preventDefault()
  openSettings()
})

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
let settings = await loadSettings()
let page: PageState = { kind: 'none' }

async function detect(): Promise<PageState> {
  if (!(await chrome.permissions.contains(ALL_SITES))) return { kind: 'permission' }
  const url = tab?.url ? new URL(tab.url) : null
  if (!tab?.id || !url || !/^https?:$/.test(url.protocol)) return { kind: 'none' }
  const host = url.hostname
  // No content script: the page was open before the extension was installed.
  const info = (await askPage(tab.id)) ?? (await inject(tab.id).then(() => askPage(tab.id!)))
  return info?.wikidot ? { kind: 'ready', host, info } : { kind: 'other', host }
}

function askPage(tabId: number) {
  return chrome.tabs
    .sendMessage(tabId, MESSAGE_PAGE_INFO)
    .then((info: PageInfo | undefined) => info ?? null)
    .catch(() => null)
}

const inject = (tabId: number) =>
  chrome.scripting.executeScript({ target: { tabId }, files: ['content/theme.js'] }).catch(() => {})

function render() {
  renderNotice()
  renderScope()
  renderThemes()
  renderAddSite()
  renderTopBar()
}

function renderNotice() {
  notice.hidden = page.kind === 'ready'
  if (page.kind === 'none') notice.replaceChildren(h('p', {}, msg('noPage')))
  else if (page.kind === 'other') notice.replaceChildren(h('p', {}, msg('notWikidot')))
  else if (page.kind === 'permission') {
    const allow = h('button', { type: 'button', class: 'primary' }, msg('allow'))
    // The request must be the first thing the click does: Firefox only allows it while
    // handling the user's input.
    allow.addEventListener('click', () => {
      chrome.permissions.request(ALL_SITES).then(async (granted) => {
        if (!granted) return
        page = await detect()
        render()
      })
    })
    notice.replaceChildren(h('p', {}, msg('needsPermission')), allow)
  }
}

/** The site this popup edits a per-site choice for, if any. */
const siteHost = () => (page.kind === 'ready' ? page.host : null)
const isPerSite = () => {
  const host = siteHost()
  return host !== null && host in settings.sites
}

function renderScope() {
  const host = siteHost()
  scope.hidden = host === null
  if (host === null) return
  document.getElementById('scope-site')!.textContent = msg('scopeSite', { host })
  const value = isPerSite() ? 'site' : 'all'
  for (const input of scope.querySelectorAll<HTMLInputElement>('input')) {
    input.checked = input.value === value
  }
}

scope.addEventListener('change', async (event) => {
  const host = siteHost()
  if (host === null) return
  const perSite = (event.target as HTMLInputElement).value === 'site'
  const sites = { ...settings.sites }
  // Start the site's own choice from what it shows now.
  if (perSite) sites[host] = themeFor(settings, host)
  else delete sites[host]
  await update({ sites })
})

function renderThemes() {
  const host = siteHost()
  const current = host === null ? settings.theme : themeFor(settings, host)
  const option = (
    id: ThemeId,
    name: string,
    hint: string,
    marker: HTMLElement,
  ): HTMLLabelElement => {
    if (settings.extraCss[id]?.trim()) hint = `${hint} · ${msg('withExtraCss')}`
    const input = h('input', { type: 'radio', name: 'theme', value: id, checked: id === current })
    input.addEventListener('change', () => choose(id))
    return h(
      'label',
      { class: 'theme', title: hint },
      input,
      marker,
      h(
        'span',
        { class: 'text' },
        h('div', { class: 'name' }, name),
        h('div', { class: 'hint' }, hint),
      ),
    )
  }
  const glyph = (text: string) => h('span', { class: 'glyph' }, text)
  const custom = settings.customThemes.map((theme) =>
    option(
      theme.id,
      theme.name,
      theme.source.kind === 'url' ? theme.source.url : theme.source.fileName,
      settings.themeColors[theme.id]?.colors.length
        ? swatches(settings.themeColors[theme.id].colors)
        : glyph(theme.source.kind === 'url' ? 'URL' : 'CSS'),
    ),
  )

  themes.replaceChildren(
    option('site', msg('siteTheme'), siteThemeHint(), glyph('—')),
    option('base', msg('baseTheme'), msg('baseThemeHint'), glyph('Aa')),
    h('div', { class: 'group' }, msg('customGroup')),
    ...(custom.length ? custom : [h('p', { class: 'empty' }, ...rich(msg('noCustomThemes')))]),
    h('div', { class: 'group' }, msg('builtinGroup')),
    ...BUILTIN_THEMES.map((theme) =>
      option(
        theme.id,
        theme.name,
        msg('byAuthor', { author: theme.author }),
        swatches(theme.colors),
      ),
    ),
  )
}

/** The theme shown on this page, unless that is the site's own. */
function pageTheme() {
  const host = siteHost()
  if (host === null) return null
  const id = themeFor(settings, host)
  const exists =
    id === 'base' ||
    BUILTIN_THEMES.some((theme) => theme.id === id) ||
    settings.customThemes.some((theme) => theme.id === id)
  return exists ? id : null
}

function renderTopBar() {
  const id = pageTheme()
  topBarField.hidden = id === null
  if (id !== null) topBarChoice.value = settings.topBar[id] ?? ''
}

topBarChoice.addEventListener('change', () => {
  const id = pageTheme()
  if (id === null) return
  const choice = topBarChoice.value as TopBarChoice | ''
  update({ topBar: withTopBarChoice(settings.topBar, id, choice) })
})

function renderAddSite() {
  const urls = page.kind === 'ready' ? page.info.siteThemes : []
  addSite.hidden = !urls.length
  const added = siteThemeAdded()
  addSite.setAttribute('aria-disabled', String(added))
  addSite.title = msg(added ? 'siteThemeAdded' : 'addSiteTheme')
  addSite.setAttribute('aria-label', addSite.title)
}

function siteThemeAdded() {
  const urls = page.kind === 'ready' ? page.info.siteThemes : []
  return settings.customThemes.some(
    ({ source }) => source.kind === 'url' && themeUrls(source).join() === urls.join(),
  )
}

addSite.addEventListener('click', () => {
  if (page.kind !== 'ready' || siteThemeAdded()) return
  const urls = page.info.siteThemes
  const theme: CustomTheme = {
    id: `custom:${crypto.randomUUID()}`,
    name: page.host.replace(/\.wikidot\.com$/, ''),
    source: { kind: 'url', url: urls[urls.length - 1], before: urls.slice(0, -1) },
  }
  update({ customThemes: [...settings.customThemes, theme] })
})

/** Names the site's own theme stylesheets when the page is known. */
function siteThemeHint() {
  if (page.kind !== 'ready') return msg('siteThemeHint')
  if (!page.info.siteThemes.length) return msg('siteThemeNone')
  return page.info.siteThemes.map(stylesheetName).join(', ')
}

function stylesheetName(href: string) {
  try {
    const url = new URL(href)
    // …/local--theme/<name>/style.css and …/common--theme/<name>/css/style.css
    const theme = url.pathname.match(/\/(?:local|common)--theme\/([^/]+)\//)
    if (theme) return decodeURIComponent(theme[1])
    const file = url.pathname.split('/').filter(Boolean).pop()
    return file ? `${url.hostname}/…/${decodeURIComponent(file)}` : url.hostname
  } catch {
    return href
  }
}

async function choose(id: ThemeId) {
  const host = siteHost()
  if (host !== null && isPerSite()) await update({ sites: { ...settings.sites, [host]: id } })
  else await update({ theme: id })
}

async function update(changes: Partial<Settings>) {
  settings = { ...settings, ...changes }
  render()
  await saveSettings(changes)
}

// The background works out the colors of a theme after it is added.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !('themeColors' in changes)) return
  settings = { ...settings, themeColors: changes.themeColors.newValue ?? {} }
  renderThemes()
})

// Last, so every declaration above is initialized.
page = await detect()
render()
