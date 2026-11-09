// The extension's real settings page, on the fake extension.
import html from '../../options.html?raw'
import logo from '../../public/icons/logo.svg?url'
import { connect, mountPage } from './connect'

const { demo } = connect()
mountPage(html, logo)
await import('../../src/options/index')
demo.frameReady('options', document)
