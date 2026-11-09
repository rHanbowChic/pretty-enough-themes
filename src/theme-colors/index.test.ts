import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractThemeColors } from '.'
import { parseColor, toHex } from './color'
import { parseDeclarations } from './css'

const hexes = (css: string) => extractThemeColors(css).map((color) => color.hex)

test('reads the usual color notations', () => {
  for (const [text, hex] of [
    ['#abc', '#aabbcc'],
    ['#AABBCCDD', '#aabbcc'],
    ['rgb(1, 2, 3)', '#010203'],
    ['rgb(1 2 3 / 50%)', '#010203'],
    ['rgba(100%, 0%, 0%, .5)', '#ff0000'],
    ['hsl(120, 100%, 50%)', '#00ff00'],
    ['Teal', '#008080'],
  ]) {
    assert.equal(toHex(parseColor(text)!), hex, text)
  }
  assert.equal(parseColor('transparent'), null)
  assert.equal(parseColor('currentColor'), null)
})

test('lists declarations through at-rules, and skips what is not the page', () => {
  const found = parseDeclarations(`
    /* a { color: red } */
    @import url("x;y.css");
    @media (max-width: 600px) { a { color: blue } }
    @keyframes k { from { color: green } }
    b { background: url(data:image/png;base64,AA==) #fff; color: red }
  `)
  assert.deepEqual(
    found.map(({ selector, property, media }) => [selector, property, media]),
    [
      ['a', 'color', '(max-width: 600px)'],
      ['b', 'background', ''],
      ['b', 'color', ''],
    ],
  )
})

test('uses variable names', () => {
  const colors = extractThemeColors(`:root {
    --primary-color: #cc0000;
    --surface: #123456;
    --text-color: #eeeeee;
    --shadow-color: #00ff00;
    --error: #ff00ff;
  }`)
  assert.deepEqual(colors.map((color) => color.hex).sort(), ['#123456', '#cc0000', '#eeeeee'])
})

test('resolves references, fallbacks, triplets and later overrides', () => {
  const css = `:root { --swatch-primary: 133, 0, 5; --bg: var(--paper, #101820); }
    body { background: rgb(var(--bg-rgb, 16, 24, 32)); }
    :root { --swatch-primary: 0, 100, 200; }
    a { color: rgb(var(--swatch-primary)); }`
  assert.deepEqual(hexes(css).slice(0, 2), ['#101820', '#0064c8'])
})

test('reads the wikidot skeleton', () => {
  const colors = extractThemeColors(`
    body { background: #1b1f23; color: #dddddd; }
    #header { background: #7a1020 url(x.png); }
    div#side-bar { background: #2c3a2e; }
    #page-content .odd-thing { background: #00ffaa; }
  `)
  assert.deepEqual(colors[0], { hex: '#1b1f23', role: 'background' })
  assert.deepEqual(colors[1], { hex: '#7a1020', role: 'primary' })
  assert.ok(!colors.some((color) => color.hex === '#00ffaa'))
})

test('a later rule replaces an earlier one', () => {
  const colors = hexes(`
    body { background: #102030; }
    #header { background: #a01030; }
    body { background-color: #ff8800; }
  `)
  assert.equal(colors[0], '#ff8800')
  assert.ok(!colors.includes('#102030'))
})

test('treats near-identical colors as one', () => {
  const colors = hexes(`
    body { background: #ffffff; }
    #container { background: #fefefe; }
    #content-wrap { background: #fcfcfc; }
    #header { background: #a00000; }
  `)
  assert.equal(colors.length, 2)
})

test('repetition does not beat the skeleton', () => {
  const noise = Array.from({ length: 60 }, (_, i) => `.x${i} { border: 1px solid #cccccc; }`)
  const colors = hexes(`${noise.join('\n')} body { background: #223344; }`)
  assert.equal(colors[0], '#223344')
})

test('ignores print styles and faint colors', () => {
  const colors = hexes(`
    @media print { body { background: #ff0000; } }
    body { background: #223344; }
    #header { background: rgba(0, 255, 0, 0.1); }
  `)
  assert.deepEqual(colors, ['#223344'])
})

test('survives anything', () => {
  assert.deepEqual(hexes(''), [])
  assert.deepEqual(hexes('}}{{ body { background'), [])
  assert.deepEqual(hexes(':root { --a: var(--a); } body { color: var(--a) }'), [])
})
