import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import {
  buildContentSecurityPolicy,
  findInlineScripts,
  hashSource,
  injectContentSecurityPolicy,
} from './contentSecurityPolicy.ts'

const sha256 = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('base64')

const page = (head: string) =>
  `<!DOCTYPE html>\n<html lang="en">\n  <head>\n${head}\n  </head>\n  <body></body>\n</html>`

const getPolicy = (html: string): string => {
  const match =
    /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)

  if (!match?.[1]) throw new Error('No Content Security Policy in the HTML')

  return match[1]
}

const getDirective = (policy: string, name: string): string[] => {
  const directive = policy
    .split(';')
    .map(part => part.trim().split(/\s+/))
    .find(([directiveName]) => directiveName === name)

  return directive?.slice(1) ?? []
}

describe('findInlineScripts', () => {
  test('returns the contents of inline scripts only', () => {
    const html = page(`
      <script type="text/javascript">console.log('a')</script>
      <script type="module" src="/src/index.tsx"></script>
      <script
        src="/registerSW.js"></script>
      <script type="module">import '/x.js'
</script>
      <script></script>`)

    expect(findInlineScripts(html)).toEqual([
      "console.log('a')",
      "import '/x.js'\n",
    ])
  })
})

describe('hashSource', () => {
  test('is the CSP sha256 source of the exact script text', () => {
    expect(hashSource('alert(1)')).toBe(`'sha256-${sha256('alert(1)')}'`)
  })
})

describe('buildContentSecurityPolicy', () => {
  test('allows same-origin script and each inline script by hash', () => {
    const policy = buildContentSecurityPolicy(
      page('<script>one()</script><script>two()</script><script>one()</script>')
    )

    expect(getDirective(policy, 'script-src')).toEqual([
      "'self'",
      `'sha256-${sha256('one()')}'`,
      `'sha256-${sha256('two()')}'`,
    ])
  })

  test("never allows 'unsafe-inline' or 'unsafe-eval', so javascript: URLs are blocked", () => {
    const policy = buildContentSecurityPolicy(page('<script>x()</script>'))

    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|\*/)
  })

  test('blocks plugins and <base> hijacking', () => {
    const policy = buildContentSecurityPolicy(page(''))

    expect(getDirective(policy, 'object-src')).toEqual(["'none'"])
    expect(getDirective(policy, 'base-uri')).toEqual(["'self'"])
  })
})

describe('injectContentSecurityPolicy', () => {
  test('puts the policy before every script', () => {
    const html = injectContentSecurityPolicy(
      page('    <meta charset="utf-8" />\n    <script>early()</script>')
    )

    const metaAt = html.indexOf('http-equiv="Content-Security-Policy"')

    expect(metaAt).toBeGreaterThan(html.indexOf('<head>'))
    expect(metaAt).toBeLessThan(html.indexOf('<script>'))
  })

  test('throws rather than ship a page without the policy', () => {
    expect(() => injectContentSecurityPolicy('<html><body/></html>')).toThrow(
      /no <head>/
    )
  })

  test("allows index.html's own inline script", () => {
    const indexHtml = readFileSync(
      new URL('../../index.html', import.meta.url),
      'utf8'
    )
    const inlineScripts = findInlineScripts(indexHtml)

    // The GitHub Pages SPA redirect. If this changes, the hash follows.
    expect(inlineScripts).toHaveLength(1)

    const policy = getPolicy(injectContentSecurityPolicy(indexHtml))

    expect(getDirective(policy, 'script-src')).toContain(
      `'sha256-${sha256(inlineScripts[0] ?? '')}'`
    )
  })
})
