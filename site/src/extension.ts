// A stand-in for the browser's extension APIs, just the parts the extension uses. The home page
// runs the extension's real popup, settings page, content script and background on it, in
// iframes that all share this one object. Settings live in memory: a reload starts over.
import type { Settings } from '../../src/settings'

export interface Tab {
  id: number
  url: string
  /** Host name of a wikidot page; null on the settings page. */
  host: string | null
}

type StorageListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  area: string,
) => void

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => unknown

const clone = <T>(value: T): T => structuredClone(value)

export class FakeExtension {
  private store: Partial<Settings> = {}
  private storageListeners = new Set<StorageListener>()
  /** The background's listeners, then those of each tab's content script. */
  private messageListeners = new Map<number | 'background', Set<MessageListener>>()
  private tabsReady = new Map<number, () => void>()
  private tabReady = new Map<number, Promise<void>>()

  /** Set by the browser around the demo. */
  activeTab: () => Tab = () => {
    throw new Error('No browser yet.')
  }
  tab: (id: number) => Tab | undefined = () => undefined
  openOptions = () => {}

  read(): Partial<Settings> {
    return clone(this.store)
  }

  /** What the extension's saveSettings() does. */
  write(changes: Partial<Settings>) {
    const entries = Object.entries(clone(changes))
    const notice: Parameters<StorageListener>[0] = {}
    for (const [key, newValue] of entries) {
      const oldValue = this.store[key as keyof Settings]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        notice[key] = { oldValue, newValue }
      }
    }
    Object.assign(this.store, Object.fromEntries(entries))
    if (Object.keys(notice).length) this.notify(notice)
  }

  clear() {
    const notice: Parameters<StorageListener>[0] = {}
    for (const [key, oldValue] of Object.entries(this.store)) notice[key] = { oldValue }
    this.store = {}
    this.notify(notice)
  }

  /** Follows every change, on behalf of the home page. */
  subscribe(listener: () => void) {
    this.storageListeners.add(listener)
  }

  private notify(changes: Parameters<StorageListener>[0]) {
    // Asynchronous, as in the browser.
    queueMicrotask(() => {
      for (const listener of [...this.storageListeners]) listener(changes, 'local')
    })
  }

  /** The page in tab `id` has its content script running. */
  markTabReady(id: number) {
    this.tabReadyPromise(id)
    this.tabsReady.get(id)?.()
  }

  forgetTab(id: number) {
    this.tabReady.delete(id)
    this.tabsReady.delete(id)
  }

  private tabReadyPromise(id: number) {
    let ready = this.tabReady.get(id)
    if (!ready) {
      ready = new Promise((resolve) => this.tabsReady.set(id, resolve))
      this.tabReady.set(id, ready)
    }
    return ready
  }

  private send(listeners: Set<MessageListener> | undefined, message: unknown) {
    return new Promise<unknown>((resolve, reject) => {
      let waiting = false
      for (const listener of listeners ?? []) {
        if (listener(message, {}, resolve) === true) waiting = true
      }
      if (!waiting && !listeners?.size) reject(new Error('Could not establish connection.'))
      else if (!waiting) queueMicrotask(() => resolve(undefined))
    })
  }

  /** The `chrome` object of one frame, or of the background when `frame` is null. */
  api(frame: Window | null, tabId?: number): typeof chrome {
    const owner = tabId ?? 'background'
    const unsubscribe: (() => void)[] = []
    frame?.addEventListener('pagehide', () => unsubscribe.forEach((remove) => remove()))

    const listen = <L>(set: Set<L>) => ({
      addListener: (listener: L) => {
        set.add(listener)
        unsubscribe.push(() => set.delete(listener))
      },
    })
    const never = { addListener: () => {} }
    const messages = () => {
      if (!this.messageListeners.has(owner)) this.messageListeners.set(owner, new Set())
      return this.messageListeners.get(owner)!
    }

    const api = {
      storage: {
        local: {
          get: (_keys: null, callback: (items: Partial<Settings>) => void) => {
            const items = this.read()
            // The content script looks itself up by location.hostname, which here is the home
            // page's. Show it the choice for the host of its tab under that name.
            const host = tabId === undefined ? undefined : this.tab(tabId)?.host
            if (host) {
              const { [host]: choice, ...others } = items.sites ?? {}
              items.sites = choice ? { ...others, [location.hostname]: choice } : others
            }
            queueMicrotask(() => callback(items))
          },
          set: (changes: Partial<Settings>, callback?: () => void) => {
            this.write(changes)
            queueMicrotask(() => callback?.())
          },
        },
        onChanged: listen(this.storageListeners),
      },
      runtime: {
        onMessage: listen(messages()),
        onInstalled: never,
        onStartup: never,
        sendMessage: (message: unknown) =>
          this.send(this.messageListeners.get('background'), message),
        getManifest: () => ({ version: __VERSION__ }),
        openOptionsPage: () => this.openOptions(),
      },
      tabs: {
        query: async () => [this.activeTab()],
        sendMessage: async (id: number, message: unknown) => {
          await this.tabReadyPromise(id)
          return this.send(this.messageListeners.get(id), message)
        },
      },
      permissions: {
        contains: async () => true,
        request: async () => true,
      },
      scripting: { executeScript: async () => [] },
      i18n: { getMessage: () => this.lang() },
    }
    return api as unknown as typeof chrome
  }

  lang: () => string = () => 'zh'
}
