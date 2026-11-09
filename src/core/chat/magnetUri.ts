/**
 * What the core will let through as a magnet URI that came from a peer.
 *
 * The string goes straight to WebTorrent's `add`, which accepts far more than a
 * magnet: an `http(s)` URL is fetched as a .torrent file, a bare info hash is
 * looked up, and a magnet's `ws`, `xs` and `as` parameters name servers it will
 * request from. A host that downloads inline media as it renders it would send
 * a request to wherever a peer pointed it. So this is an allowlist of the shape
 * WebTorrent itself writes for a torrent a client offers — one info hash, an
 * optional display name, and websocket trackers — and anything else is not
 * treated as a magnet at all.
 */

/** The parameters a magnet URI written by a client of this app can carry. */
enum MagnetParam {
  EXACT_TOPIC = 'xt',
  DISPLAY_NAME = 'dn',
  TRACKER = 'tr',
}

const magnetPrefix = 'magnet:?'

/**
 * Generous: a name is at most a file name, and each tracker is a short URL, so
 * a real magnet is a small fraction of this.
 */
export const magnetUriMaxLength = 4096

const maxTrackers = 32

const bitTorrentInfoHashTopic = /^urn:btih:(?:[0-9a-f]{40}|[a-z2-7]{32})$/i

/** The BEP 52 multihash of a hybrid torrent: `1220` is sha2-256, 32 bytes. */
const bitTorrentV2InfoHashTopic = /^urn:btmh:1220[0-9a-f]{64}$/i

/** Trackers a browser can speak to; WebTorrent in a browser has no other kind. */
const trackerProtocols = ['ws:', 'wss:']

const decode = (value: string): string | null => {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

const isTrackerUrl = (encoded: string) => {
  const decoded = decode(encoded)

  if (decoded === null) return false

  try {
    return trackerProtocols.includes(new URL(decoded).protocol)
  } catch {
    return false
  }
}

/**
 * Whether `value` is a magnet URI this client should hand to its file
 * transfer. Everything it admits is a string, so the predicate is a plain
 * narrowing of `unknown`.
 */
export const isSafeMagnetUri = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  if (value.length > magnetUriMaxLength) return false
  if (!value.startsWith(magnetPrefix)) return false

  let infoHashes = 0
  let v2InfoHashes = 0
  let trackers = 0

  for (const param of value.slice(magnetPrefix.length).split('&')) {
    const separator = param.indexOf('=')

    // WebTorrent skips a parameter like this rather than failing on it; there
    // is no reason for a magnet to carry one, so neither do we.
    if (separator === -1) return false

    const key = param.slice(0, separator)
    const parameterValue = param.slice(separator + 1)

    switch (key) {
      case MagnetParam.EXACT_TOPIC:
        if (bitTorrentInfoHashTopic.test(parameterValue)) infoHashes++
        else if (bitTorrentV2InfoHashTopic.test(parameterValue)) v2InfoHashes++
        else return false

        break

      case MagnetParam.DISPLAY_NAME:
        // WebTorrent decodes the name itself and throws on a malformed one.
        if (decode(parameterValue) === null) return false

        break

      case MagnetParam.TRACKER:
        if (++trackers > maxTrackers || !isTrackerUrl(parameterValue)) {
          return false
        }

        break

      default:
        return false
    }
  }

  return infoHashes === 1 && v2InfoHashes <= 1
}
