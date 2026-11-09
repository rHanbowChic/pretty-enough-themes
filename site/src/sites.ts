// The two made-up wikidot sites of the demo: the same skeleton as a real wikidot page, and in
// internal-style the same kinds of @import. Their themes are in public/local--theme/, a path
// the popup recognizes.
import type { Locale } from '../../src/i18n'

type Localized<T = string> = Record<Locale, T>

const CDN = 'https://d3g0gp89917ko0.cloudfront.net/v--1e049c54eb7c'

export interface DemoSite {
  id: string
  host: string
  path: string
  name: Localized
  tagline: Localized
  /** The text of `<style id="internal-style">`. */
  internalStyle: string
  /** `#top-bar`, in the page's language. */
  topBar: (nav: string) => string
  nav: Localized<string[]>
  side: Localized<string[]>
  title: Localized
  content: Localized
  tags: Localized<string[]>
}

const internalStyle = (theme: string) => `
/* modules */
@import url(${CDN}/common--modules/css/pagerate/PageRateWidgetModule.css);

/* theme */
@import url(${CDN}/common--theme/base/css/style.css);
@import url(../local--theme/${theme}/style.css);
`

const list = (items: string[]) =>
  `<ul>${items.map((item) => `<li><a href="#">${item}</a></li>`).join('')}</ul>`

const collapsible = (show: string, body: string) => `
<div class="collapsible-block">
  <div class="collapsible-block-unfolded"><a class="collapsible-block-link" href="#">${show}</a></div>
  <div class="collapsible-block-folded" hidden>${body}</div>
</div>`

export const SITES: DemoSite[] = [
  {
    id: 'field-notes',
    host: 'example.wikidot.com',
    path: '/lichen-survey',
    name: { zh: '野外笔记', en: 'Field Notes' },
    tagline: { zh: '一个虚构的观察记录站', en: 'A made-up wiki of observations' },
    internalStyle: internalStyle('field-notes'),
    // Follows the SCP Foundation's theme: wrappers that older themes know nothing of.
    topBar: (nav) => `<div class="top-bar">${nav}</div><div class="mobile-top-bar">${nav}</div>`,
    nav: {
      zh: ['首页', '观察记录', '物种索引', '工具'],
      en: ['Home', 'Observations', 'Species', 'Tools'],
    },
    side: {
      zh: ['最近更新', '随机页面', '站点成员', '写作指南'],
      en: ['Recent changes', 'Random page', 'Members', 'Writing guide'],
    },
    title: { zh: '北坡地衣调查', en: 'North slope lichen survey' },
    content: {
      zh: `
<p>这份记录汇总了三次沿北坡步道的观察。样方设在<a href="#">步道两侧</a>的岩面和树干上，每个样方约一平方米。</p>
<blockquote><p>地衣长得很慢。今年看到的一块斑，很可能和十年前是同一块。</p></blockquote>
<h2><span>样方结果</span></h2>
<table class="wiki-content-table">
<tr><th>样方</th><th>基质</th><th>覆盖度</th><th>优势类型</th></tr>
<tr><td>A1</td><td>花岗岩</td><td>40%</td><td>壳状</td></tr>
<tr><td>A2</td><td>花岗岩</td><td>25%</td><td>壳状</td></tr>
<tr><td>B1</td><td>树干</td><td>60%</td><td>叶状</td></tr>
</table>
<h2><span>下一步</span></h2>
<ul>
<li>在 B 区增加两个样方</li>
<li>对比<a href="#">去年的照片</a></li>
<li>记录雨后的颜色变化</li>
</ul>
${collapsible('+ 展开测量方法', '<p>用 10 厘米网格估算覆盖度，每个样方由两人分别估算后取平均值。</p>')}`,
      en: `
<p>These notes bring together three walks along the north slope trail. Plots sit on rock and bark <a href="#">beside the trail</a>, each about one square metre.</p>
<blockquote><p>Lichens grow slowly. A patch seen this year may well be the patch of ten years ago.</p></blockquote>
<h2><span>Plots</span></h2>
<table class="wiki-content-table">
<tr><th>Plot</th><th>Substrate</th><th>Cover</th><th>Main form</th></tr>
<tr><td>A1</td><td>Granite</td><td>40%</td><td>Crustose</td></tr>
<tr><td>A2</td><td>Granite</td><td>25%</td><td>Crustose</td></tr>
<tr><td>B1</td><td>Bark</td><td>60%</td><td>Foliose</td></tr>
</table>
<h2><span>Next</span></h2>
<ul>
<li>Add two plots in area B</li>
<li>Compare with <a href="#">last year's photos</a></li>
<li>Note how the colors change after rain</li>
</ul>
${collapsible('+ Show the method', '<p>Cover is estimated on a 10 cm grid, by two people separately, and averaged.</p>')}`,
    },
    tags: { zh: ['地衣', '北坡'], en: ['lichen', 'north-slope'] },
  },
  {
    id: 'tea-house',
    host: 'wiki.example.org',
    path: '/brewing',
    name: { zh: '茶事簿', en: 'Tea Ledger' },
    tagline: { zh: '一个虚构的、用自己域名的站点', en: 'A made-up wiki on its own domain' },
    internalStyle: internalStyle('tea-house'),
    topBar: (nav) => nav,
    nav: {
      zh: ['首页', '茶单', '器具', '笔记'],
      en: ['Home', 'Teas', 'Teaware', 'Notes'],
    },
    side: {
      zh: ['最近更新', '随机一款', '加入编辑'],
      en: ['Recent changes', 'Random tea', 'Join in'],
    },
    title: { zh: '冲泡参数', en: 'Brewing parameters' },
    content: {
      zh: `
<p>下面是我们常用的起点，不是标准答案。水质和器具不同，结果也不同，可以<a href="#">在笔记里</a>记下你的版本。</p>
<table class="wiki-content-table">
<tr><th>茶类</th><th>水温</th><th>投茶量</th><th>首泡</th></tr>
<tr><td>绿茶</td><td>80 ℃</td><td>3 g / 150 ml</td><td>60 秒</td></tr>
<tr><td>乌龙</td><td>95 ℃</td><td>5 g / 100 ml</td><td>40 秒</td></tr>
<tr><td>红茶</td><td>90 ℃</td><td>3 g / 150 ml</td><td>90 秒</td></tr>
</table>
<h2><span>换水之前</span></h2>
<ol>
<li>先用热水温杯</li>
<li>闻一闻干茶</li>
<li>每次只改一个参数</li>
</ol>
<blockquote><p>茶太苦时，先缩短时间，再降低水温。</p></blockquote>`,
      en: `
<p>These are the starting points we use, not the right answers. Water and teaware change the result, so <a href="#">keep notes</a> on your own version.</p>
<table class="wiki-content-table">
<tr><th>Tea</th><th>Water</th><th>Leaf</th><th>First steep</th></tr>
<tr><td>Green</td><td>80 ℃</td><td>3 g / 150 ml</td><td>60 s</td></tr>
<tr><td>Oolong</td><td>95 ℃</td><td>5 g / 100 ml</td><td>40 s</td></tr>
<tr><td>Black</td><td>90 ℃</td><td>3 g / 150 ml</td><td>90 s</td></tr>
</table>
<h2><span>Before you change the water</span></h2>
<ol>
<li>Warm the cup first</li>
<li>Smell the dry leaf</li>
<li>Change one thing at a time</li>
</ol>
<blockquote><p>If the tea is bitter, shorten the steep before you lower the temperature.</p></blockquote>`,
    },
    tags: { zh: ['冲泡'], en: ['brewing'] },
  },
]

export const siteById = (id: string | null) => SITES.find((site) => site.id === id) ?? SITES[0]

const search: Localized = { zh: '搜索本站', en: 'Search this site' }
const license: Localized = {
  zh: '这是一个虚构的演示页面。',
  en: 'This is a made-up demo page.',
}

/** The page, laid out like wikidot's. */
export const pageBody = (site: DemoSite, lang: Locale) => `
<div id="skrollr-body">
<div id="container-wrap-wrap">
  <div id="container-wrap">
    <div id="container">
      <div id="header">
        <h1><a href="#"><span>${site.name[lang]}</span></a></h1>
        <h2><span>${site.tagline[lang]}</span></h2>
        <div id="search-top-box" class="form-search">
          <form id="search-top-box-form" class="input-append">
            <input id="search-top-box-input" class="text empty search-query" type="text" size="15" placeholder="${search[lang]}" /><input class="button btn" type="submit" value="&#128269;" />
          </form>
        </div>
        <div id="top-bar">${site.topBar(navList(site.nav[lang]))}</div>
        <div id="login-status"><a href="#" class="login-status-sign-in btn btn-primary">${lang === 'zh' ? '登录' : 'Sign in'}</a></div>
        <div id="header-extra-div-1"><span></span></div><div id="header-extra-div-2"><span></span></div><div id="header-extra-div-3"><span></span></div>
      </div>
      <div id="content-wrap">
        <div id="side-bar">${list(site.side[lang])}</div>
        <div id="main-content">
          <div id="action-area-top"></div>
          <div id="page-title">${site.title[lang]}</div>
          <div id="page-content">${site.content[lang]}</div>
          <div class="page-tags"><span>${site.tags[lang].map((tag) => `<a href="#">${tag}</a>`).join('')}</span></div>
          <div id="page-info-break"></div>
          <div id="page-options-container"></div>
        </div>
      </div>
      <div id="footer"><div class="options"><a href="#">${lang === 'zh' ? '帮助' : 'Help'}</a> | <a href="#">${lang === 'zh' ? '条款' : 'Terms'}</a></div></div>
      <div id="license-area" class="license-area">${license[lang]}</div>
      <div id="extrac-div-1"><span></span></div><div id="extrac-div-2"><span></span></div><div id="extrac-div-3"><span></span></div>
    </div>
  </div>
</div>
</div>`

const navList = list
