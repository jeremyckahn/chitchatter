import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * Tests for the hardened StreamSaver.js that Chitchatter installs from its fork
 * (jeremyckahn/StreamSaver.js, pinned by commit in package.json; an `overrides`
 * entry makes secure-file-transfer use the same copy). They drive the real
 * module through its iframe strategy, the one Chromium and Firefox use on a
 * secure origin, and fail if the dependency ever resolves to upstream's code.
 */

const mitmOrigin = 'https://mitm.example'
const mitmUrl = `${mitmOrigin}/StreamSaver.js/mitm.html`

interface StreamSaver {
  mitm: string
  createWriteStream: (filename: string) => WritableStream<Uint8Array>
}

const isStreamSaver = (value: unknown): value is StreamSaver =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'mitm') === 'string' &&
  typeof Reflect.get(value, 'createWriteStream') === 'function'

/**
 * Imports a fresh copy of the module, as a secure-context browser with
 * service workers and transferable streams would see it. StreamSaver reads
 * those capabilities once, at import time.
 */
const importStreamSaver = async (): Promise<StreamSaver> => {
  vi.resetModules()

  const { HTMLElement } = window

  // StreamSaver treats an `HTMLElement` whose source mentions "constructor"
  // as Safari and falls back to Blobs. jsdom's does; real Chromium's does not.
  window.HTMLElement = class extends HTMLElement {}
  Object.defineProperty(window.HTMLElement, 'toString', {
    value: () => 'function HTMLElement() { [native code] }',
  })

  try {
    const module: Record<string, unknown> = await import('streamsaver')
    const streamSaver = module['default']

    if (!isStreamSaver(streamSaver)) {
      throw new Error('streamsaver did not export the StreamSaver API')
    }

    streamSaver.mitm = mitmUrl

    return streamSaver
  } finally {
    window.HTMLElement = HTMLElement
  }
}

const getIframes = () => Array.from(document.querySelectorAll('iframe'))

/**
 * Starts a download and lets the mitm iframe "load", returning what
 * StreamSaver posted to it.
 */
const startDownload = async (streamSaver: StreamSaver) => {
  streamSaver.createWriteStream('secret.txt')

  const [mitmFrame] = getIframes()

  if (!mitmFrame?.contentWindow) throw new Error('No mitm iframe was created')

  const postMessage = vi
    .spyOn(mitmFrame.contentWindow, 'postMessage')
    .mockImplementation(() => {})

  mitmFrame.dispatchEvent(new Event('load'))

  expect(postMessage).toHaveBeenCalledTimes(1)
  // The spy's type is postMessage's last overload; StreamSaver calls the
  // (message, targetOrigin, transfer) one, so read the arguments untyped.
  const args: readonly unknown[] = postMessage.mock.calls[0] ?? []
  const [message, targetOrigin, transfer] = args

  if (!Array.isArray(transfer) || !(transfer[0] instanceof MessagePort)) {
    throw new Error('StreamSaver did not transfer a MessagePort')
  }

  return { mitmFrame, message, targetOrigin, port: transfer[0] }
}

/** Lets queued MessagePort deliveries run. */
const flushMessages = () => new Promise(resolve => setTimeout(resolve, 20))

describe('hardened StreamSaver', () => {
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'serviceWorker')
    document.body.innerHTML = ''
  })

  test('creates its mitm iframe without a referrer', async () => {
    const streamSaver = await importStreamSaver()
    const { mitmFrame } = await startDownload(streamSaver)

    expect(mitmFrame.src).toBe(mitmUrl)
    expect(mitmFrame.referrerPolicy).toBe('no-referrer')
  })

  test("posts the download only to the mitm page's origin, never '*'", async () => {
    const streamSaver = await importStreamSaver()
    const { targetOrigin, message } = await startDownload(streamSaver)

    expect(targetOrigin).toBe(mitmOrigin)
    expect(message).toMatchObject({ transferringReadable: true })
  })

  test('uses the origin of the mitm URL set after import', async () => {
    const streamSaver = await importStreamSaver()

    streamSaver.mitm = 'https://other-mitm.example/mitm.html?version=2.0.0'

    const { targetOrigin } = await startDownload(streamSaver)

    expect(targetOrigin).toBe('https://other-mitm.example')
  })

  test("opens a download URL inside the mitm page's directory", async () => {
    const streamSaver = await importStreamSaver()
    const { port } = await startDownload(streamSaver)
    const downloadUrl = `${mitmOrigin}/StreamSaver.js/0.123/secret.txt`

    port.postMessage({ download: downloadUrl })
    await flushMessages()

    expect(getIframes().map(iframe => iframe.src)).toEqual([
      mitmUrl,
      downloadUrl,
    ])
    port.close()
  })

  test.each([
    // eslint-disable-next-line no-script-url -- the attack payload under test; StreamSaver must reject it
    ['a javascript: URL', "javascript:void(top.postMessage(origin, '*'))"],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a blob: URL', `blob:${mitmOrigin}/1b4ad3c0-0000-4000-8000-000000000000`],
    ['another origin', 'https://attacker.example/StreamSaver.js/0.1/x.txt'],
    ['a downgrade to http:', 'http://mitm.example/StreamSaver.js/0.1/x.txt'],
    ['a relative URL', '/StreamSaver.js/0.1/x.txt'],
    // A github.io user site shares one origin across all of its projects.
    ['another path on the mitm origin', `${mitmOrigin}/other-project/x.html`],
    [
      'a sibling path sharing the prefix',
      `${mitmOrigin}/StreamSaver.jsx/x.html`,
    ],
    [
      'a dot segment out of the scope',
      `${mitmOrigin}/StreamSaver.js/../x.html`,
    ],
    [
      'an encoded dot segment out of the scope',
      `${mitmOrigin}/StreamSaver.js/%2e%2e/x.html`,
    ],
    // new URL() would stringify this to a valid mitm-origin URL.
    ['a non-string', [`${mitmOrigin}/StreamSaver.js/0.1/x.txt`]],
  ])('rejects %s as a download URL', async (_, download) => {
    const streamSaver = await importStreamSaver()
    const { port } = await startDownload(streamSaver)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    port.postMessage({ download })
    await flushMessages()

    expect(getIframes().map(iframe => iframe.src)).toEqual([mitmUrl])
    expect(error).toHaveBeenCalledWith(
      '[StreamSaver] Rejected untrusted download URL'
    )
    port.close()
  })
})
