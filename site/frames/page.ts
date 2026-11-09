// A wikidot page with the extension's real content script.
import { pageBody, siteById } from '../src/sites'
import { connect } from './connect'

const { demo, tabId } = connect()
const site = siteById(new URLSearchParams(location.search).get('site'))

document.title = site.name[demo.lang]
document.documentElement.lang = demo.lang === 'zh' ? 'zh-CN' : 'en'
document.body.id = 'html-body'

const style = document.createElement('style')
style.id = 'internal-style'
style.textContent = site.internalStyle
document.head.append(style)
document.body.insertAdjacentHTML('afterbegin', pageBody(site, demo.lang))

// Nothing here leads anywhere.
document.addEventListener('click', (event) => {
  const target = event.target as Element
  const block = target.closest('.collapsible-block')
  if (target.closest('a')) event.preventDefault()
  if (block && target.closest('.collapsible-block-link')) {
    const body = block.querySelector<HTMLElement>('.collapsible-block-folded')!
    body.hidden = !body.hidden
  }
})
document.addEventListener('submit', (event) => event.preventDefault())

await import('../../src/content/theme')
demo.frameReady('page', document, tabId)
