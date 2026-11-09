import {
  loadSettings,
  saveSettings,
  themeUrls,
  withTopBarChoice,
  type CustomTheme,
  type Settings,
  type ThemeId,
  type TopBarChoice,
} from '../settings'
import { BUILTIN_THEMES, builtinTheme } from '../themes'
import { absolutize } from '../themes/absolutize'
import { h, localize, msg, rich, swatches } from '../ui/dom'
import type { MessageKey } from '../ui/messages'
import './index.css'

localize()
document.getElementById('version')!.textContent = chrome.runtime.getManifest().version

let settings = await loadSettings()
/** Editor saves waiting for typing to stop. */
let pendingSaves = 0

// The popup may change the settings while this page is open. Re-rendering would close the
// editors' caret, so skip echoes of this page's own saves, and wait for pending edits.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return
  // Painted in place: the background saves colors while the user may still be typing.
  if ('themeColors' in changes) {
    settings = { ...settings, themeColors: changes.themeColors.newValue ?? {} }
    paintColors()
  }
  if (pendingSaves) return
  const loaded = await loadSettings()
  if (JSON.stringify(loaded) === JSON.stringify(settings)) return
  settings = loaded
  render()
})

async function update(changes: Partial<Settings>) {
  settings = { ...settings, ...changes }
  render()
  await saveSettings(changes)
}

function render() {
  renderThemes()
  renderSites()
}

function themeName(id: ThemeId) {
  if (id === 'site') return msg('siteTheme')
  if (id === 'base') return msg('baseTheme')
  return (
    builtinTheme(id)?.name ??
    settings.customThemes.find((theme) => theme.id === id)?.name ??
    msg('missingTheme')
  )
}

const empty = (key: MessageKey) => h('li', { class: 'empty' }, ...rich(msg(key)))

// --- Themes ---

const themeList = document.getElementById('theme-list')!
const themesStatus = document.getElementById('themes-status')!

/** Open editors, as `<theme id>|extra` or `<theme id>|css`. */
const openPanels = new Set<string>()

interface Row {
  id: ThemeId
  name: string
  kind?: string
  source?: string
  custom?: CustomTheme
  /** CSS to copy when cloning, or the URL to download it from. */
  cloneFrom?: { fileName: string; css: string } | { urls: string[] }
}

function rows(): Row[] {
  return [
    { id: 'site', name: msg('siteTheme'), source: msg('siteThemeHint') },
    { id: 'base', name: msg('baseTheme'), source: msg('baseThemeHint') },
    ...BUILTIN_THEMES.map((theme): Row => ({
      id: theme.id,
      name: theme.name,
      kind: msg('kindBuiltin'),
      source: msg('byAuthor', { author: theme.author }),
      cloneFrom: { fileName: `${theme.id}.css`, css: theme.css },
    })),
    ...settings.customThemes.map((theme): Row => ({
      id: theme.id,
      name: theme.name,
      kind: msg(theme.source.kind === 'url' ? 'urlSource' : 'fileSource'),
      source:
        theme.source.kind === 'url' ? themeUrls(theme.source).join(' + ') : theme.source.fileName,
      custom: theme,
      cloneFrom:
        theme.source.kind === 'url'
          ? { urls: themeUrls(theme.source) }
          : { fileName: theme.source.fileName, css: theme.source.css },
    })),
  ]
}

function renderThemes() {
  themeList.replaceChildren(...rows().map(themeRow))
  paintColors()
}

function paintColors() {
  for (const card of themeList.querySelectorAll<HTMLElement>('.theme-card')) {
    const id = card.dataset.theme!
    const colors = builtinTheme(id)?.colors ?? settings.themeColors[id]?.colors ?? []
    card
      .querySelector('.card-colors')!
      .replaceChildren(...(colors.length ? [swatches(colors)] : []))
  }
}

function themeRow(row: Row) {
  const { custom } = row
  let name: HTMLElement
  if (custom) {
    const input = h('input', { type: 'text', value: row.name, class: 'name' })
    input.setAttribute('aria-label', msg('name'))
    input.addEventListener('change', () => {
      const value = input.value.trim() || custom.name
      input.value = value
      update({
        customThemes: settings.customThemes.map((t) =>
          t.id === custom.id ? { ...t, name: value } : t,
        ),
      })
    })
    name = input
  } else name = h('span', { class: 'name' }, row.name)

  const panels: HTMLElement[] = []
  const toggles: HTMLElement[] = []
  const panel = (key: 'extra' | 'css', label: string, build: () => HTMLElement) => {
    const id = `${row.id}|${key}`
    const button = h('button', { type: 'button' }, label)
    const element = h('div', { class: 'panel', hidden: !openPanels.has(id) })
    if (openPanels.has(id)) element.append(build())
    button.setAttribute('aria-expanded', String(openPanels.has(id)))
    button.addEventListener('click', () => {
      const opening = !openPanels.has(id)
      if (opening) openPanels.add(id)
      else openPanels.delete(id)
      button.setAttribute('aria-expanded', String(opening))
      element.hidden = !opening
      element.replaceChildren(...(opening ? [build()] : []))
      if (opening) element.querySelector('textarea')?.focus()
    })
    if (key === 'extra' && settings.extraCss[row.id]?.trim()) button.classList.add('has-content')
    toggles.push(button)
    panels.push(element)
  }

  panel('extra', msg('extraCss'), () =>
    editor(
      msg('extraCssHint', { name: row.name }),
      settings.extraCss[row.id] ?? '',
      (css) => {
        const extraCss = { ...settings.extraCss }
        if (css.trim()) extraCss[row.id] = css
        else delete extraCss[row.id]
        return extraCss
      },
      (extraCss) => ({ extraCss }),
      msg('extraCssPlaceholder'),
    ),
  )
  if (custom?.source.kind === 'file') {
    panel('css', msg('editCss'), () =>
      editor(
        msg('editCssHint'),
        custom.source.kind === 'file' ? custom.source.css : '',
        (css) =>
          settings.customThemes.map((t) =>
            t.id === custom.id && t.source.kind === 'file'
              ? { ...t, source: { ...t.source, css } }
              : t,
          ),
        (customThemes) => ({ customThemes }),
      ),
    )
  }

  const actions = h('div', { class: 'actions' }, ...toggles)
  if (row.cloneFrom) {
    const button = h('button', { type: 'button' }, msg('clone'))
    button.addEventListener('click', () => clone(row, button))
    actions.append(button)
  }
  if (custom) actions.append(confirmButton(() => remove(custom.id)))

  const card = h(
    'li',
    { class: 'theme-card' },
    h(
      'div',
      { class: 'card-head' },
      h(
        'div',
        { class: 'card-title' },
        h('span', { class: 'card-colors' }),
        name,
        row.kind && h('span', { class: 'kind' }, row.kind),
      ),
      row.source && h('div', { class: 'source', title: row.source }, row.source),
    ),
    h(
      'div',
      { class: 'card-bar' },
      row.id !== 'site' &&
        h(
          'label',
          { class: 'top-bar-choice', title: msg('topBarHint') },
          h('span', {}, msg('topBar')),
          topBarSelect(row.id),
        ),
      actions,
    ),
    ...panels,
  )
  card.dataset.theme = row.id
  return card
}

/** The top bar choice of a theme. Saved without re-rendering, so the select keeps its focus. */
function topBarSelect(id: ThemeId) {
  const select = h(
    'select',
    {},
    h('option', { value: '' }, msg('topBarAuto')),
    h('option', { value: 'flatten' }, msg('topBarFlatten')),
    h('option', { value: 'keep' }, msg('topBarKeep')),
  )
  select.value = settings.topBar[id] ?? ''
  select.addEventListener('change', () => {
    const topBar = withTopBarChoice(settings.topBar, id, select.value as TopBarChoice | '')
    settings = { ...settings, topBar }
    saveSettings({ topBar })
  })
  return select
}

/**
 * A CSS text box. Edits are saved shortly after typing stops, without re-rendering, so the
 * caret stays; `value` turns the text into the new value of a setting, `changes` into the
 * settings to save.
 */
function editor<T>(
  hint: string,
  text: string,
  value: (css: string) => T,
  changes: (value: T) => Partial<Settings>,
  placeholder = '',
) {
  const textarea = h('textarea', { value: text, spellcheck: false, placeholder })
  const status = h('span', { class: 'muted' })
  let timer: number | undefined
  const save = () => {
    timer = undefined
    pendingSaves--
    const next = changes(value(textarea.value))
    settings = { ...settings, ...next }
    saveSettings(next).then(() => {
      status.textContent = msg('saved')
      setTimeout(() => (status.textContent = ''), 1500)
    })
  }
  textarea.addEventListener('input', () => {
    if (timer === undefined) pendingSaves++
    else clearTimeout(timer)
    timer = window.setTimeout(save, 400)
  })
  textarea.addEventListener('blur', () => {
    if (timer === undefined) return
    clearTimeout(timer)
    save()
  })
  // Tab indents instead of leaving the box; Escape then Tab still leaves it.
  let escaped = false
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') escaped = true
    else if (event.key === 'Tab' && !event.shiftKey && !escaped) {
      event.preventDefault()
      textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end')
      textarea.dispatchEvent(new Event('input'))
    } else escaped = false
  })
  return h('div', {}, h('p', { class: 'description' }, ...rich(hint), ' ', status), textarea)
}

/** Copies a theme into a new file theme, with its extra CSS. */
async function clone(row: Row, button: HTMLButtonElement) {
  const from = row.cloneFrom!
  let fileName: string
  let css: string
  if ('urls' in from) {
    button.disabled = true
    const texts = await Promise.all(
      from.urls.map((url) =>
        fetch(url, { credentials: 'omit' })
          .then((response) => (response.ok ? response.text() : null))
          .catch(() => null),
      ),
    )
    button.disabled = false
    const failed = texts.indexOf(null)
    if (failed >= 0) {
      setThemesStatus(msg('cloneFailed', { url: from.urls[failed] }), 'error')
      return
    }
    css = texts.map((text, i) => absolutize(text!, from.urls[i])).join('\n')
    const main = from.urls[from.urls.length - 1]
    const file = new URL(main).pathname.split('/').filter(Boolean).pop() ?? 'style'
    fileName = /\.css$/i.test(file) ? file : `${file}.css`
  } else ({ fileName, css } = from)

  const name = msg('cloneName', { name: row.name })
  const theme: CustomTheme = {
    id: `custom:${crypto.randomUUID()}`,
    name,
    source: { kind: 'file', fileName, css },
  }
  const extraCss = { ...settings.extraCss }
  if (settings.extraCss[row.id]) extraCss[theme.id] = settings.extraCss[row.id]
  const topBar = withTopBarChoice(settings.topBar, theme.id, settings.topBar[row.id] ?? '')
  openPanels.add(`${theme.id}|css`)
  await update({ customThemes: [...settings.customThemes, theme], extraCss, topBar })
  setThemesStatus(msg('cloned', { name }))
  themeList.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function setThemesStatus(text: string, kind: '' | 'error' = '') {
  themesStatus.className = `status ${kind}`
  themesStatus.replaceChildren(...rich(text))
}

/** A delete button that asks for a second click. */
function confirmButton(action: () => void) {
  const button = h('button', { type: 'button' }, msg('delete'))
  let timer: number | undefined
  button.addEventListener('click', () => {
    if (button.classList.contains('danger')) {
      clearTimeout(timer)
      action()
      return
    }
    button.classList.add('danger')
    button.textContent = msg('confirmDelete')
    timer = window.setTimeout(() => {
      button.classList.remove('danger')
      button.textContent = msg('delete')
    }, 3000)
  })
  return button
}

/** Deletes a theme; sites that used it go back to their own theme. */
function remove(id: string) {
  const sites = Object.fromEntries(
    Object.entries(settings.sites).filter(([, theme]) => theme !== id),
  )
  const extraCss = { ...settings.extraCss }
  delete extraCss[id]
  for (const key of [...openPanels]) if (key.startsWith(`${id}|`)) openPanels.delete(key)
  update({
    customThemes: settings.customThemes.filter((theme) => theme.id !== id),
    theme: settings.theme === id ? 'site' : settings.theme,
    sites,
    extraCss,
    topBar: withTopBarChoice(settings.topBar, id, ''),
  })
}

function add(name: string, source: CustomTheme['source']) {
  const theme: CustomTheme = { id: `custom:${crypto.randomUUID()}`, name, source }
  return update({ customThemes: [...settings.customThemes, theme] })
}

function setStatus(form: HTMLFormElement, text: string, kind: '' | 'error' | 'warning' = '') {
  const status = form.querySelector('.status')!
  status.className = `status ${kind}`
  status.replaceChildren(...rich(text))
}

const urlForm = document.getElementById('add-url') as HTMLFormElement
urlForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const urlField = urlForm.elements.namedItem('url') as HTMLInputElement
  const nameField = urlForm.elements.namedItem('name') as HTMLInputElement
  let url: URL
  try {
    url = new URL(urlField.value.trim())
    if (!/^https?:$/.test(url.protocol)) throw new Error()
  } catch {
    setStatus(urlForm, msg('invalidUrl'), 'error')
    urlField.focus()
    return
  }
  const name = nameField.value.trim() || defaultName(url)
  await add(name, { kind: 'url', url: url.href })
  urlForm.reset()
  if (url.protocol === 'http:') setStatus(urlForm, msg('httpWarning'), 'warning')
  else setStatus(urlForm, msg('added', { name }))
})

/** A name from the address: the theme folder of wikidot theme URLs, else the file name. */
function defaultName(url: URL) {
  const theme = url.pathname.match(/\/(?:local|common)--theme\/([^/]+)\//)
  if (theme) return decodeURIComponent(theme[1])
  const code = url.pathname.match(/^\/(.+)\/code\/\d+$/)
  if (code) return `${url.hostname.split('.')[0]}: ${decodeURIComponent(code[1])}`
  const file = url.pathname.split('/').filter(Boolean).pop()
  return file ? decodeURIComponent(file).replace(/\.css$/i, '') : url.hostname
}

const fileForm = document.getElementById('add-file') as HTMLFormElement
const fileInput = fileForm.elements.namedItem('file') as HTMLInputElement
document.getElementById('choose-file')!.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0]
  if (!file) return
  const css = await file.text()
  fileInput.value = ''
  if (!css.trim()) {
    setStatus(fileForm, msg('emptyFile'), 'error')
    return
  }
  const name = file.name.replace(/\.css$/i, '')
  await add(name, { kind: 'file', fileName: file.name, css })
  setStatus(fileForm, msg('added', { name }))
})

// --- Sites ---

function renderSites() {
  document
    .getElementById('site-choices-hint')!
    .replaceChildren(...rich(msg('siteChoicesHint', { theme: themeName(settings.theme) })))
  const entries = Object.entries(settings.sites).sort(([a], [b]) => a.localeCompare(b))
  document.getElementById('site-list')!.replaceChildren(
    ...(entries.length
      ? entries.map(([host, id]) => {
          const button = h('button', { type: 'button' }, msg('remove'))
          button.addEventListener('click', () => {
            const sites = { ...settings.sites }
            delete sites[host]
            update({ sites })
          })
          return h(
            'li',
            {},
            h('span', { class: 'grow' }, host),
            h('span', { class: 'muted' }, themeName(id)),
            button,
          )
        })
      : [empty('noSiteChoices')]),
  )
}

// --- About ---

function renderCredits() {
  document
    .getElementById('credits')!
    .replaceChildren(
      ...BUILTIN_THEMES.map((theme) =>
        h(
          'li',
          {},
          h('a', { href: theme.page, target: '_blank', rel: 'noopener' }, theme.name),
          ` — ${msg('byAuthor', { author: theme.author })}`,
        ),
      ),
    )
}

// Last, so every declaration above is initialized.
render()
renderCredits()
