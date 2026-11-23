import { createHash } from 'node:crypto'

import type { Plugin } from 'vite'

/**
 * The Content Security Policy for the app's HTML, delivered as a `<meta>` tag
 * because GitHub Pages, which hosts Chitchatter, cannot send HTTP headers.
 *
 * It restricts only what a `<meta>` policy can enforce and what the app does
 * not need: no inline or `javascript:` script beyond the hashed inline scripts
 * of index.html, no plugins and no `<base>` hijacking. An iframe the app
 * creates inherits this policy, so a `javascript:` URL loaded into one is
 * blocked. Connections, frames, media and styles are left alone: WebRTC,
 * trackers, the StreamSaver frame and Emotion's runtime styles all need them,
 * and `frame-ancestors` is ignored in a `<meta>` policy anyway.
 */
export const baseDirectives = {
  'script-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
} as const satisfies Record<string, readonly string[]>

// A <script> start tag with no src attribute, then its contents.
const inlineScriptPattern =
  /<script\b(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script\s*>/gi

/**
 * The contents of every inline `<script>` element in an HTML document.
 */
export const findInlineScripts = (html: string): string[] =>
  Array.from(html.matchAll(inlineScriptPattern), ([, contents]) => contents)
    .filter((contents): contents is string => contents !== undefined)
    .filter(contents => contents.length > 0)

/**
 * The CSP source expression that allows exactly this inline script.
 */
export const hashSource = (script: string): string =>
  `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`

/**
 * The policy for an HTML document, allowing its own inline scripts by hash.
 */
export const buildContentSecurityPolicy = (html: string): string => {
  const scriptHashes = [...new Set(findInlineScripts(html).map(hashSource))]
  const directives: Record<string, readonly string[]> = {
    ...baseDirectives,
    'script-src': [...baseDirectives['script-src'], ...scriptHashes],
  }

  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(' '))
    .join('; ')
}

const headStartPattern = /<head\b[^>]*>/i

/**
 * Adds the policy as the first element of `<head>`. A `<meta>` policy only
 * governs what comes after it, so it must precede every script.
 */
export const injectContentSecurityPolicy = (html: string): string => {
  const headStart = headStartPattern.exec(html)

  if (!headStart) {
    throw new Error('Cannot add a Content Security Policy: no <head> tag')
  }

  const policy = buildContentSecurityPolicy(html)
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
  const insertAt = headStart.index + headStart[0].length

  return `${html.slice(0, insertAt)}\n    ${meta}${html.slice(insertAt)}`
}

/**
 * Adds the Content Security Policy to index.html in both the dev server and
 * the build. It runs last so it sees, and hashes, inline scripts other
 * plugins inject, such as React Refresh's preamble in development.
 */
export const contentSecurityPolicyPlugin = (): Plugin => ({
  name: 'chitchatter:content-security-policy',
  transformIndexHtml: {
    order: 'post',
    handler: injectContentSecurityPolicy,
  },
})
