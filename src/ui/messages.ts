import { t } from '../i18n'

/**
 * Strings of popup.html and options.html, keyed by the elements' `data-i18n` attribute, and
 * of the scripts. `code` spans in backticks, bold text in `**`; `{x}` is filled in by fill().
 */
export const MESSAGES = {
  // Popup
  popupTitle: t('Pretty Enough Themes', 'Pretty Enough Themes'),
  settings: t('Settings', '设置'),
  manageThemes: t('Import and manage themes…', '导入、管理版式…'),
  scope: t('Apply to', '应用于'),
  scopeAll: t('All sites', '所有站点'),
  scopeSite: t('Only {host}', '仅 {host}'),
  notWikidot: t(
    'This page is not a wikidot page. The theme you pick applies to all sites.',
    '当前页面不是 wikidot 页面。在此选择的版式应用于所有站点。',
  ),
  noPage: t('Pick the theme for all wikidot sites.', '选择所有 wikidot 站点使用的版式。'),
  needsPermission: t(
    'The extension needs access to all sites to change themes: wikidot sites can have any domain, and themes can be hosted anywhere.',
    '扩展需要访问所有网站才能更改版式：wikidot 站点可以使用任意域名，版式也可能托管在任何地方。',
  ),
  allow: t('Allow', '允许'),
  siteTheme: t('Site default', '站点默认'),
  siteThemeHint: t("The theme chosen by the site's admins", '站点管理员设置的版式'),
  siteThemeNone: t('The site uses the base theme only', '站点只使用基础样式'),
  baseTheme: t('No theme', '无版式'),
  baseThemeHint: t("Only wikidot's plain base styles", '只保留 wikidot 的基础样式'),
  byAuthor: t('by {author}', '作者 {author}'),
  customGroup: t('Your themes', '自定义版式'),
  builtinGroup: t('Built-in', '内置版式'),
  noCustomThemes: t('None yet.', '还没有。'),
  withExtraCss: t('+ extra CSS', '+ 附加 CSS'),
  topBar: t('Top bar', '顶栏结构'),
  topBarHint: t(
    'How this theme treats the top bar of sites that have .top-bar. Automatic goes by whether the theme mentions .mobile-top-bar. Change it if the top bar looks wrong.',
    '在有 .top-bar 的站点上，这个版式如何处理顶栏。「自动」看版式是否提到 .mobile-top-bar。顶栏显示不正常时可以手动更改。',
  ),
  topBarAuto: t('Automatic', '自动'),
  topBarFlatten: t('Extract .top-bar', '提取 .top-bar'),
  topBarKeep: t('Keep the site’s', '保持站点结构'),
  addSiteTheme: t("Add this site's theme to your themes", '将本站版式添加到自定义版式'),
  siteThemeAdded: t("This site's theme is in your themes", '本站版式已在自定义版式中'),

  // Options
  optionsTitle: t('Pretty Enough Themes Settings', 'Pretty Enough Themes 设置'),
  themes: t('Themes', '版式'),
  themesHint: t(
    '**Extra CSS** is added after a theme wherever it is used, for example to set the CSS variables of a community theme. **Clone** makes an editable copy of a theme, stored like a theme added from a file.',
    '**附加 CSS** 会在使用该版式的页面上追加在版式之后，例如用来设置社区版式的 CSS 变量。**克隆** 生成一份可以编辑的副本，与从文件添加的版式一样保存在扩展中。',
  ),
  addTheme: t('Add a theme', '添加版式'),
  kindBuiltin: t('Built-in', '内置'),
  extraCss: t('Extra CSS', '附加 CSS'),
  extraCssHint: t(
    'Added after {name} and its fixes, so it can override them. Changes apply to open pages right away.',
    '追加在「{name}」及扩展的修正之后，可以覆盖它们。修改会立即应用到已打开的页面。',
  ),
  extraCssPlaceholder: t(
    ':root {\n  --example-color: #333;\n}',
    ':root {\n  --example-color: #333;\n}',
  ),
  editCss: t('Edit CSS', '编辑 CSS'),
  editCssHint: t(
    'The CSS of this theme. Changes apply to open pages right away.',
    '此版式的 CSS。修改会立即应用到已打开的页面。',
  ),
  clone: t('Clone', '克隆'),
  cloneName: t('{name} (copy)', '{name}（副本）'),
  cloned: t('Cloned as “{name}”.', '已克隆为「{name}」。'),
  cloneFailed: t('Could not download `{url}`.', '无法下载 `{url}`。'),
  saved: t('Saved', '已保存'),
  name: t('Name', '名称'),
  delete: t('Delete', '删除'),
  confirmDelete: t('Click again to delete', '再次点击以删除'),
  fromUrl: t('Add from a URL', '从网址添加'),
  fromUrlHint: t(
    'The address of a CSS file, for example a wikidot custom theme (`https://site.wdfiles.com/local--theme/name/style.css`) or a code block (`https://site.wikidot.com/page/code/1`). The file is loaded from that address every time, so changes to it show up. Use `https://`: browsers block `http://` stylesheets on wikidot pages.',
    'CSS 文件的地址，例如 wikidot 自定义主题（`https://站点.wdfiles.com/local--theme/名称/style.css`）或页面代码块（`https://站点.wikidot.com/页面/code/1`）。每次都从该地址加载，文件更新后会随之变化。请使用 `https://`：浏览器会拦截 wikidot 页面上的 `http://` 样式表。',
  ),
  fromFile: t('Add from a file', '从文件添加'),
  fromFileHint: t(
    'A `.css` file on your computer. Its content is stored in the extension; add it again after you change the file. Relative `url()`s in it cannot be resolved, so images need absolute addresses.',
    '本地的 `.css` 文件。文件内容保存在扩展中，修改文件后需要重新添加。其中的相对 `url()` 无法解析，图片需要使用完整地址。',
  ),
  urlPlaceholder: t('https://…/style.css', 'https://…/style.css'),
  namePlaceholder: t('Name (optional)', '名称（可选）'),
  add: t('Add', '添加'),
  chooseFile: t('Choose file…', '选择文件…'),
  invalidUrl: t('Enter an http:// or https:// address.', '请输入 http:// 或 https:// 开头的地址。'),
  httpWarning: t(
    'Added, but `http://` stylesheets are blocked on https pages. Use `https://` if the host supports it.',
    '已添加，但 https 页面会拦截 `http://` 样式表。如果对方支持，请改用 `https://`。',
  ),
  added: t('Added “{name}”.', '已添加「{name}」。'),
  emptyFile: t('The file is empty.', '文件是空的。'),
  urlSource: t('URL', '网址'),
  fileSource: t('File', '文件'),
  sites: t('Sites', '站点'),
  siteChoices: t('Per-site themes', '单独设置的站点'),
  siteChoicesHint: t(
    'Sites given their own theme with “Only this site” in the popup. Other sites use the theme chosen for all sites: **{theme}**.',
    '在弹出菜单中用「仅此站点」单独设置了版式的站点。其他站点使用「所有站点」的版式：**{theme}**。',
  ),
  noSiteChoices: t('None.', '没有。'),
  remove: t('Remove', '移除'),
  missingTheme: t('(deleted theme)', '（已删除的版式）'),
  about: t('About', '关于'),
  aboutVersion: t('Version', '版本'),
  aboutLicense: t('License', '许可证'),
  builtinCredits: t('Built-in themes', '内置版式'),
  builtinCreditsHint: t(
    'From themes.wikidot.com, under the Creative Commons Attribution-ShareAlike 3.0 license.',
    '来自 themes.wikidot.com，以知识共享 署名-相同方式共享 3.0 许可协议授权。',
  ),
}

export type MessageKey = keyof typeof MESSAGES
