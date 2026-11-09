// The extension's real popup: its markup, styles and script, on the fake extension.
import html from '../../popup.html?raw'
import logo from '../../public/icons/logo.svg?url'
import { connect, mountPage } from './connect'

const { demo } = connect()
mountPage(html, logo)
await import('../../src/popup/index')
// Fixed for the browser's popup window; here the frame sets the width.
document.body.style.width = 'auto'
demo.frameReady('popup', document)
