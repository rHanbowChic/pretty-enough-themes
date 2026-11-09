// Finds the three colors that best represent a wikidot theme. Works on the CSS text alone and
// knows nothing of the extension; see README.md.
import { chroma, distance, parseColor, toHex, toLab, type Color, type Lab } from './color'
import { parseDeclarations, type Declaration } from './css'
import { classify, type Role } from './roles'
import { collectVariables, roleOfName, substitute, variableColor } from './variables'

export type { Role } from './roles'

export interface ThemeColor {
  /** `#rrggbb`. */
  hex: string
  /** What the color is mostly used for. */
  role: Role
}

/** Colors closer than this in OKLab count as one. */
const SAME = 0.05
/** Colors must be this far from those already chosen. */
const DISTINCT = 0.1
const COUNT = 3

/** Mostly see-through colors say little about the theme. */
const MIN_ALPHA = 0.3

const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\([^()]*\)|\b[a-z]+\b/gi

interface Sighting {
  color: Color
  role: Role
  weight: number
}

interface Cluster {
  color: Color
  lab: Lab
  /** Weights per role, heaviest use first. */
  weights: Map<Role, number[]>
}

/** Drops declarations a later one of the same rule target replaces, as the cascade would. */
function effective(declarations: Declaration[]) {
  const seen = new Set<string>()
  const kept = [...declarations].reverse().filter(({ selector, property, media }) => {
    if (property.startsWith('--')) return true
    const name = property === 'background-color' ? 'background' : property
    const key = `${media}|${selector.replace(/\s+/g, ' ').trim().toLowerCase()}|${name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return kept.reverse()
}

function sightings(css: string): Sighting[] {
  const declarations = effective(parseDeclarations(css))
  const variables = collectVariables(declarations)
  const found: Sighting[] = []
  const add = (color: Color | null, role: Role, weight: number) => {
    if (color && color.alpha >= MIN_ALPHA && weight > 0) {
      found.push({ color, role, weight: weight * color.alpha })
    }
  }

  for (const [name, value] of variables) {
    const use = roleOfName(name)
    if (use) add(variableColor(substitute(value, variables)), use.role, use.weight)
  }
  for (const declaration of declarations) {
    if (declaration.property.startsWith('--')) continue
    const use = classify(declaration)
    if (!use) continue
    const value = substitute(declaration.value, variables).replace(/url\([^)]*\)/gi, ' ')
    const tokens = value.match(COLOR_TOKEN) ?? []
    const colors = tokens.map(parseColor).filter((color) => color !== null)
    // Each stop of a gradient only paints a part of it.
    const share = /gradient\(/i.test(value) ? 0.6 : 1
    for (const color of colors) add(color, use.role, use.weight * share)
  }
  return found
}

function cluster(found: Sighting[]): Cluster[] {
  const clusters: Cluster[] = []
  for (const { color, role, weight } of [...found].sort((a, b) => b.weight - a.weight)) {
    const lab = toLab(color)
    let home = clusters.find((other) => distance(other.lab, lab) < SAME)
    if (!home) {
      home = { color, lab, weights: new Map() }
      clusters.push(home)
    }
    home.weights.set(role, [...(home.weights.get(role) ?? []), weight])
  }
  return clusters
}

/** Repeats count, but ever less: one body background outweighs fifty stray borders. */
function score(weights: number[] | undefined) {
  if (!weights?.length) return 0
  const [top, ...rest] = weights
  return top + 1.5 * Math.sqrt(rest.reduce((sum, weight) => sum + weight, 0))
}

const roleScore = (cluster: Cluster, role: Role) => score(cluster.weights.get(role))

const total = (cluster: Cluster) =>
  [...cluster.weights.values()].reduce((sum, weights) => sum + score(weights), 0)

function mainRole(cluster: Cluster): Role {
  let best: Role = 'other'
  for (const role of cluster.weights.keys()) {
    if (roleScore(cluster, role) > roleScore(cluster, best)) best = role
  }
  return best
}

/** Pure black and white are on every page; colors tell themes apart. */
const vivid = (cluster: Cluster) => 1 + 5 * chroma(cluster.lab)

/** Up to three colors: the background, then what stands out from it most. */
export function extractThemeColors(css: string): ThemeColor[] {
  const clusters = cluster(sightings(css))
  const chosen: Cluster[] = []
  const apart = (cluster: Cluster) =>
    chosen.every((other) => distance(other.lab, cluster.lab) >= DISTINCT)
  const pick = (value: (cluster: Cluster) => number) => {
    let best: Cluster | null = null
    let bestValue = 0
    for (const cluster of clusters) {
      if (chosen.includes(cluster) || !apart(cluster)) continue
      const current = value(cluster)
      if (current > bestValue) [best, bestValue] = [cluster, current]
    }
    if (best) chosen.push(best)
  }

  pick((c) => roleScore(c, 'background') * 2 + roleScore(c, 'surface'))
  pick(
    (c) =>
      (roleScore(c, 'primary') * 2 + roleScore(c, 'secondary') + roleScore(c, 'other')) * vivid(c),
  )
  while (chosen.length < COUNT) {
    const before = chosen.length
    pick((c) => {
      const gap = Math.min(...chosen.map((other) => distance(other.lab, c.lab)), 0.3) / 0.3
      const quiet = mainRole(c) === 'text' ? 0.5 : 1
      return total(c) * vivid(c) * gap * quiet
    })
    if (chosen.length === before) break
  }
  return chosen.map((cluster) => ({ hex: toHex(cluster.color), role: mainRole(cluster) }))
}
