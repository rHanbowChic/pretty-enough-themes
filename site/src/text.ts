// The strings scripts need, by language. The page's own text is in index.html, Chinese in the
// elements and English in their `data-en`.
import type { Locale } from '../../src/i18n'

const en = {
  pageTitle: 'Pretty Enough Themes: pick the theme of any wikidot site',
  settingsTab: 'Pretty Enough Themes Settings',
  close: 'Close',
  soon: 'Link not available yet',
  sourceRemoved: 'the site’s theme',
  sourceTheme: 'the chosen theme, {count} lines',
  sourceExtra: 'extra CSS, {count} lines',
  sourceFlattened: 'contents of `.top-bar` moved up, `.mobile-top-bar` gone',
  toDark: 'Switch to the dark look',
  toLight: 'Switch to the light look',
  showKept: 'See the top bar without the fix',
  hideKept: 'Restore the fix',
  addExtra: 'Add some extra CSS',
  removeExtra: 'Remove the extra CSS',
  nothingFound: 'No colors found in this CSS.',
  roleBackground: 'Background',
  roleSurface: 'Surface',
  rolePrimary: 'Primary',
  roleSecondary: 'Secondary',
  roleText: 'Text',
  roleOther: 'Other',
  pastedTheme: 'Pasted theme',
}

const zh: typeof en = {
  pageTitle: 'Pretty Enough Themes：为任意 wikidot 站点换上你选的版式',
  settingsTab: 'Pretty Enough Themes 设置',
  close: '关闭',
  soon: '链接尚未开放',
  sourceRemoved: '站点的版式',
  sourceTheme: '所选版式，{count} 行',
  sourceExtra: '附加 CSS，{count} 行',
  sourceFlattened: '`.top-bar` 的内容已提取，`.mobile-top-bar` 随之移除',
  toDark: '切换到深色外观',
  toLight: '切换到浅色外观',
  showKept: '查看修正前的顶栏',
  hideKept: '恢复修正',
  addExtra: '加一段附加 CSS',
  removeExtra: '去掉附加 CSS',
  nothingFound: '这段 CSS 里没有找到颜色。',
  roleBackground: '背景',
  roleSurface: '表面',
  rolePrimary: '主色',
  roleSecondary: '辅色',
  roleText: '文字',
  roleOther: '其他',
  pastedTheme: '粘贴的版式',
}

/** Strings in the current language. */
export const text = { ...zh }

export function setTextLocale(locale: Locale) {
  Object.assign(text, locale === 'zh' ? zh : en)
}

export const say = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
