const IMPORT = /@import\s+(?:url\(\s*(['"]?)([^'")]*)\1\s*\)|(['"])(.*?)\3)/g

/** The addresses `css` @imports, as written. */
export const importedUrls = (css: string) =>
  [...css.matchAll(IMPORT)].map((match) => match[2] ?? match[4]).filter(Boolean)
