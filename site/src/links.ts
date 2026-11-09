// Fill these in to make the links work. While one is empty, its links are inert.
const REPO = 'https://github.com/rHanbowChic/pretty-enough-themes'

export const LINKS = {
  github: REPO,
  chrome: `${REPO}/releases/latest`,
  firefox: `${REPO}/releases/latest`,
}

export type LinkName = keyof typeof LINKS
