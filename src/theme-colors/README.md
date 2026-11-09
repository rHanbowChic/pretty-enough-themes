# theme-colors

从一段 CSS 文本里提取最能代表这个 wikidot 版式的三种颜色。

```ts
import { extractThemeColors } from './theme-colors'

extractThemeColors(css)
// [{ hex: '#ffffff', role: 'background' }, { hex: '#bb0011', role: 'primary' }, …]
```

模块只依赖 CSS 文本，不依赖浏览器、扩展 API 或项目里的其他代码。`@import` 由调用方展开：把被导入的样式表拼在前面再传入。颜色不足时返回的数量会少于三个。

## 步骤

1. **读取**（`css.ts`）：列出所有声明及其选择器、`@media` 条件。`@keyframes`、`@font-face` 等跳过。
   同一选择器、同一属性的声明，只保留最后一条。这样附加 CSS 覆盖的颜色不会再算进去。
2. **变量**（`variables.ts`）：展开 `var()`，支持回退值和 `rgb(var(--x))` 用的 `12, 34, 56` 写法。变量名里的 primary、background、surface、text 等词决定角色；shadow、error、hover 这类词排除或降权。
3. **用途**（`roles.ts`）：按 wikidot 骨架判断声明画的是哪部分。`body`、`#container-wrap`、`#container` 的背景是页面背景，`#content-wrap`、`#side-bar` 是表面色，`#header`、`#top-bar` 和链接是主色，普通规则的权重很低。`:hover` 等状态、窄屏和暗色 `@media` 降权，`print` 忽略。
4. **合并**：OKLab 距离小于 0.05 的颜色算同一种，保留权重最高的那个。
5. **计分**：同一种颜色重复出现时，只有最重的一次全额计入，其余按平方根累加，所以一个 `body` 背景胜过几十条零散边框。
6. **选择**：先选背景，再选最突出的主色（有彩度的颜色加权），最后选与前两者差异最大的颜色。三者之间至少相差 0.1。

## 局限

只看 CSS 文本，看不到图片。老版式常用图片画顶栏和背景（例如 Midnight Coal 的 `body` 其实是白色），结果会和看到的不同。

测试：`npm run test`。
