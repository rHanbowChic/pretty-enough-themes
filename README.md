# Pretty Enough Themes

Chrome / Firefox 扩展：把 wikidot 站点的版式（theme）换成你选的版式。点击工具栏图标打开弹出菜单，在内置版式、自定义版式之间切换，立即生效，不用刷新页面。

## 原理

wikidot 站点几乎都用同一套 HTML 骨架，版式都写在同一个元素里：

```html
<style type="text/css" id="internal-style">
  /* modules */
  @import url(https://d3g0gp89917ko0.cloudfront.net/v--…/common--modules/css/…);
  /* theme */
  @import url(https://d3g0gp89917ko0.cloudfront.net/v--…/common--theme/base/css/style.css);
  @import url(https://woptheme.pages.dev/WOPMainTheme.css);
</style>
```

内容脚本（`src/content/theme.ts`，`document_start`）在解析器写完这个元素后：

- 保留 `common--modules/`（当前页面用到的模块样式）和 `common--theme/base/`（基础样式，社区版式都以它为前提）的 `@import`；
- 去掉其余 `@import`，即管理员设置的版式（内置主题、自定义主题、外部 CSS 地址）；
- 在它后面插入 `<style id="pretty-enough-theme">`，放入所选版式。页面里的 `[[module CSS]]` 仍排在版式之后，层叠顺序与原来一致。

原始文本会被记住，选回「站点默认」时原样恢复。

### `.mobile-top-bar`

不少社区站点仿照 SCP 基金会，在 `nav:top` 里用 wikidot 标记把菜单包进 `.top-bar`，再加一个移动端的 `.mobile-top-bar`，由版式决定何时显示哪个。较早的版式（包括 themes.wikidot.com 上的）按 wikidot 原生的 `#top-bar > ul` 编写，不认识这两层结构，于是会出现两个顶栏，用了 flex 的版式还会错位。因此，所选版式（及其 `@import` 的样式表）没有提到 `.mobile-top-bar`、而站点存在 `.top-bar` 时，扩展把 `.top-bar` 的内部元素提取出来，覆盖 `#top-bar` 原有的内容；`.mobile-top-bar` 也随之移除。换回支持它的版式或站点默认时，页面结构会原样恢复（`src/content/mobile-top-bar.ts`）。

- 检查时去掉注释，并沿着 `@import` 最多向下追三层；网址版式就是从它的地址开始追。
- 被导入的样式表由后台脚本读取，不受 CORS 限制（wikidot 托管的 CSS 就没有 CORS 头）。
- 结果出来之前先提取；有样式表读不到时（例如地址失效），还原，交给版式处理。
- 「站点默认」不做这项处理。

是否提到 `.mobile-top-bar` 只是推测：有些老版式以较新的版式为基底，文字里提到了它，实际却不支持。所以每个版式都可以手动设置「顶栏结构」（设置页的版式行，或弹出菜单里当前版式的选项）：「自动」按上面的方式判断，「提取 .top-bar」和「保持站点结构」直接以用户的设置为准，不再读取样式表。这个设置按版式保存，克隆时一并复制；同一个版式在不同站点需要不同设置时，可以克隆一份，再用「仅此站点」分配。

可选项：

| 选项         | 效果                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| 站点默认     | 不做改动                                                                   |
| 无版式       | 只保留基础样式                                                             |
| 内置版式     | 扩展自带的 CSS                                                             |
| 自定义：网址 | 插入 `@import url(…)`，每次从该地址加载；CSS 里的相对 `url()` 按该地址解析 |
| 自定义：文件 | 文件内容保存在扩展里直接插入；其中的相对 `url()` 无法解析                  |

版式可以对所有站点生效，也可以在弹出菜单中选「仅此站点」单独设置。

版式在设置页管理（弹出菜单的齿轮或「导入、管理版式…」）。设置页列出全部版式（包括站点默认、无版式与内置版式）：

- **附加 CSS**：每个版式都可以写一段 CSS，在使用该版式的页面上追加在版式之后（`<style id="pretty-enough-theme-extra">`）。适合设置 Sigma-9 等社区版式的 CSS 变量；写在「站点默认」上的附加 CSS 作用于保留原版式的站点。判断 `.mobile-top-bar` 时，附加 CSS 也算在版式里。
- **克隆**：内置版式与自定义版式都可以克隆。副本与从文件添加的版式一样存储（`source.kind: 'file'`），可以直接编辑 CSS；网址版式克隆时下载其内容，并把相对 `url()`、`@import` 改成完整的 https 地址（`src/themes/absolutize.ts`）。附加 CSS 一并复制。
- **编辑 CSS**：文件版式（含克隆的副本）的 CSS 可在设置页直接修改。
- **添加本站版式**：在 wikidot 站点上打开弹出菜单，用右上角齿轮左边的加号可以一键把站点当前的版式保存为网址类自定义版式。名称取自站点域名，可在设置页修改。站点版式由多个样式表组成时（例如扩展了其他版式），全部保留并按原顺序加载。页面里的 `[[module CSS]]` 不在其中。
- **主题色**：弹出菜单和设置页用三个色块展示版式。内置版式的颜色是写好的；自定义版式新增或修改（包括附加 CSS）后，由后台脚本读取 CSS（含 `@import`），用 `src/theme-colors/` 算出，存在 `themeColors` 里。网址版式在浏览器启动时重新计算。
- 自定义版式可以改名、删除；删除后，使用它的站点回到站点默认，其附加 CSS 一并删除。

编辑框在停止输入约 0.4 秒后保存，已打开的页面随即更新。设置页还可以查看、移除单独设置的站点。

### 内置版式

取自 <https://themes.wikidot.com/> 的 Best rated，作者与许可（CC BY-SA 3.0）见设置页「关于」：

- [Midnight Coal](https://themes.wikidot.com/midnight-coal)（pieterh）
- [Monobook](https://themes.wikidot.com/monobook)（Fereal）
- [Maple](https://themes.wikidot.com/maple)（bcammo）

CSS 由 `npm run themes`（`scripts/fetch-themes.mjs`）下载到 `src/themes/`，并已提交，构建时不需要联网。脚本会把相对 `url()` 改成完整的 `https://` 地址：扩展把 CSS 文本插入页面，相对地址会按 wikidot 站点解析而失效。增加内置版式时，同时修改脚本中的列表和 `src/themes/index.ts`。

### 权限

扩展申请所有网站的访问权限（`*://*/*`）：wikidot 站点可以使用任意域名，版式样式表也可能托管在任何地方，而扩展要读取它们才能判断是否支持 `.mobile-top-bar`。

内容脚本因此在每个网页上运行，但只检查页面有没有 wikidot 的 `#internal-style`；不是 wikidot 页面时不读取设置，也不做任何改动。

用户在浏览器里收回权限后，弹出菜单会显示「允许」按钮，重新申请。

### 已知限制

- 有些站点的 `nav:top`、`nav:side` 里放了只给原版式准备、平时被它隐藏的内容，换版式后会露出来。除顶栏外不做处理。
- `[[module CSS]]` 写的样式保留不动，可能与新版式冲突。
- 设置在确认页面是 wikidot 站点（`#internal-style` 解析完）之后才异步读取，原版式可能在首次绘制前短暂出现。

## 开发

```shell
npm install
npm run dev     # 监听并构建到 build/
npm run build   # 类型检查 + 构建
npm run zip     # 构建并打包到 package/
npm run themes  # 重新下载内置版式
```

在 `chrome://extensions` 开启开发者模式，选择「加载已解压的扩展程序」并指向 `build/`。需要 Chrome 111+。

### Firefox

```shell
npm run dev:firefox    # 监听并构建到 build-firefox/
npm run build:firefox  # 类型检查 + 构建
npm run run:firefox    # 用临时配置启动 Firefox 并加载 build-firefox/
npm run lint:firefox   # 构建并用 web-ext 按 AMO 规则检查
npm run zip:firefox    # 构建并打包到 package/（未签名）
npm run sign:firefox   # 构建、打包源码，并交给 AMO 签名
```

需要 Firefox 128+。源码与 Chrome 版相同，只有 manifest 在构建时转换（见 `scripts/build.mjs` 的 `toFirefox`）：`background.service_worker` 换成 `background.scripts`，并加上 `browser_specific_settings.gecko`（扩展 ID `pretty-enough-themes@ect.fyi`）。签名方法同 wikidot-monaco：`WEB_EXT_API_KEY=… WEB_EXT_API_SECRET=… npm run sign:firefox`。

`npm run crx` 打包 `.crx`，签名私钥默认在 `~/Documents/pretty-enough-themes/key.pem`（可用 `CRX_KEY` 指定），首次运行时创建。私钥决定扩展 ID，之后要一直使用同一个。

### 图标

PET（Pretty Enough Themes）是一只摆出 `:3` 表情的小狗。`public/icons/logo.svg` 是原图，16px 用逐像素绘制的 `public/icons/logo-16.svg`（由 `scripts/pixel-icon.py` 生成），原图缩到 16px 会糊。修改后重新生成 PNG 与 favicon：

```shell
python3 scripts/pixel-icon.py public/icons/logo-16.svg
rsvg-convert -w 16 -h 16 public/icons/logo-16.svg -o public/img/logo-16.png
for s in 32 48 128; do rsvg-convert -w $s -h $s public/icons/logo.svg -o public/img/logo-$s.png; done
magick public/img/logo-16.png public/img/logo-32.png public/img/logo-48.png public/icons/logo.ico
```

## 主页

项目主页在 `site/`，是可以部署到任意路径的静态站点（例如 GitHub Pages 的项目页）：

```shell
npm run site          # 开发服务器
npm run site:build    # 类型检查 + 构建到 site/dist/
npm run site:preview  # 预览构建结果
```

- **链接**：GitHub 和下载地址在 `site/src/links.ts`，填上就生效；留空时链接不跳转。
- **文字**：中文写在 `site/index.html` 的元素里，英文写在它的 `data-en` 属性里；脚本用到的文字在 `site/src/text.ts`。
- **样式**：`site/src/site.css` 以设置页的样式为基础，深色模式沿用扩展的配色。

主页的演示运行扩展的真实代码，不是仿制的界面：`site/src/extension.ts` 用内存模拟 `chrome.*` API，`site/frames/` 在 iframe 里加载 `popup.html`、`options.html`、`src/content/theme.ts`，主页本身运行 `src/background.ts`。所以扩展改动后，主页的演示随之更新。`site/src/sites.ts` 是两个虚构站点，它们的默认版式在 `site/public/local--theme/`。

演示有两个外部依赖：wikidot CDN 上的基础样式，以及内置版式引用的图片。计算主题色用到 `crypto.subtle`，需要 https 或 localhost。

## 结构

- `src/content/theme.ts`：内容脚本，替换版式；回答弹出菜单的页面信息查询
- `src/content/mobile-top-bar.ts`：判断版式是否支持 `.mobile-top-bar`，不支持时还原原生顶栏
- `src/background.ts`：替内容脚本读取样式表；计算自定义版式的主题色
- `src/theme-colors/`：独立模块，从 CSS 文本提取三种主题色
- `src/popup/`：弹出菜单，选择版式与应用范围
- `src/options/`：设置页，管理版式（附加 CSS、克隆、编辑）与单独设置的站点
- `src/themes/`：内置版式的 CSS 与元数据；`absolutize.ts` 供克隆网址版式时改写地址
- `src/settings.ts`：存储格式（`chrome.storage.local`）
- `src/ui/`：弹出菜单与设置页共用的样式、文字（`messages.ts`）与 DOM 工具
- `site/`：项目主页，见上文
- `src/i18n.ts`：界面语言。浏览器界面为简体或繁体中文时显示中文，其他语言显示英文
