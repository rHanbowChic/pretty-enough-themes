// Reading CSS colors, and comparing them in OKLab, where distances match what people see.

export interface Color {
  r: number
  g: number
  b: number
  /** 0–1. */
  alpha: number
}

export interface Lab {
  L: number
  a: number
  b: number
}

/** The CSS named colors. */
const NAMED: Record<string, string> = Object.fromEntries(
  'aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32'
    .split(' ')
    .flatMap((word, i, words) => (i % 2 ? [] : [[word, words[i + 1]]])),
)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function fromHex(hex: string): Color | null {
  let digits = hex.replace('#', '')
  if (digits.length === 3 || digits.length === 4) digits = digits.replace(/./g, '$&$&')
  if (digits.length !== 6 && digits.length !== 8) return null
  const part = (i: number) => parseInt(digits.slice(i, i + 2), 16)
  return { r: part(0), g: part(2), b: part(4), alpha: digits.length === 8 ? part(6) / 255 : 1 }
}

const channel = (text: string) =>
  text.endsWith('%') ? (parseFloat(text) * 255) / 100 : parseFloat(text)
const unit = (text: string | undefined) =>
  text === undefined ? 1 : text.endsWith('%') ? parseFloat(text) / 100 : parseFloat(text)

function fromHsl(h: number, s: number, l: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/** Reads one color. Returns null for anything else, `transparent` and `currentColor` included. */
export function parseColor(text: string): Color | null {
  const value = text.trim().toLowerCase()
  if (value.startsWith('#')) return /^#[0-9a-f]+$/.test(value) ? fromHex(value) : null
  if (value in NAMED) return fromHex(NAMED[value])
  const match = value.match(/^(rgb|hsl)a?\(([^()]*)\)$/)
  if (!match) return null
  const parts = match[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const alpha = clamp(unit(parts[3]), 0, 1)
  let rgb: [number, number, number]
  if (match[1] === 'rgb') rgb = [channel(parts[0]), channel(parts[1]), channel(parts[2])]
  else {
    const hue = ((parseFloat(parts[0]) % 360) + 360) % 360
    rgb = fromHsl(hue, clamp(unit(parts[1]), 0, 1), clamp(unit(parts[2]), 0, 1))
  }
  if (rgb.some(Number.isNaN) || Number.isNaN(alpha)) return null
  const [r, g, b] = rgb.map((c) => Math.round(clamp(c, 0, 255)))
  return { r, g, b, alpha }
}

export const toHex = ({ r, g, b }: Color) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

const linear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function toLab({ r, g, b }: Color): Lab {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

export const distance = (x: Lab, y: Lab) => Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b)
export const chroma = ({ a, b }: Lab) => Math.hypot(a, b)
