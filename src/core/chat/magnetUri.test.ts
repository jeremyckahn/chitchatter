import { describe, expect, it } from 'vitest'

import { isSafeMagnetUri, magnetUriMaxLength } from 'core/chat/magnetUri'

const infoHash = 'c'.repeat(40)
const topic = `xt=urn:btih:${infoHash}`
const tracker = (host: string) =>
  `tr=${encodeURIComponent(`wss://${host}/announce`)}`

describe('isSafeMagnetUri', () => {
  it.each([
    ['a bare magnet', `magnet:?${topic}`],
    ['a name', `magnet:?${topic}&dn=my+image+(1).png`],
    ['an encoded name', `magnet:?${topic}&dn=${encodeURIComponent('é & ü')}`],
    [
      'parameters in any order',
      `magnet:?dn=a&${tracker('t.example')}&${topic}`,
    ],
    [
      'a base32 hash',
      'magnet:?xt=urn:btih:' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.slice(0, 32),
    ],
    [
      'a hybrid v1 and v2 hash',
      `magnet:?${topic}&xt=urn:btmh:1220${'d'.repeat(64)}`,
    ],
    [
      'a local development tracker',
      `magnet:?${topic}&tr=${encodeURIComponent('ws://localhost:8000')}`,
    ],
  ])('accepts %s', (_label, magnetURI) => {
    expect(isSafeMagnetUri(magnetURI)).toBe(true)
  })

  it('accepts as many trackers as it allows, and no more', () => {
    const withTrackers = (count: number) =>
      `magnet:?${topic}&${Array.from({ length: count }, (_, i) => tracker(`t${i}.example`)).join('&')}`

    expect(isSafeMagnetUri(withTrackers(32))).toBe(true)
    expect(isSafeMagnetUri(withTrackers(33))).toBe(false)
  })

  it('accepts a value right up to the length limit and not past it', () => {
    const prefix = `magnet:?${topic}&dn=`

    expect(
      isSafeMagnetUri(prefix + 'x'.repeat(magnetUriMaxLength - prefix.length))
    ).toBe(true)
    expect(
      isSafeMagnetUri(
        prefix + 'x'.repeat(magnetUriMaxLength - prefix.length + 1)
      )
    ).toBe(false)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 5],
    ['an array', [`magnet:?${topic}`]],
    ['an empty string', ''],
    ['an http URL', 'https://example.com/a.torrent'],
    ['a bare info hash', infoHash],
    ['a different scheme', `stream-magnet:?${topic}`],
    ['an upper-case scheme', `MAGNET:?${topic}`],
    ['leading whitespace', ` magnet:?${topic}`],
    ['no parameters', 'magnet:?'],
    ['only a name', 'magnet:?dn=a'],
    ['only a v2 hash', `magnet:?xt=urn:btmh:1220${'d'.repeat(64)}`],
    ['trailing junk after the hash', `magnet:?${topic}zz`],
    ['an encoded hash', `magnet:?xt=urn%3Abtih%3A${infoHash}`],
    ['the same hash twice', `magnet:?${topic}&${topic}`],
    ['a stray ampersand', `magnet:?${topic}&`],
    ['a parameter with no value separator', `magnet:?${topic}&dn`],
    ['a malformed escape in the name', `magnet:?${topic}&dn=%E0%A4%A`],
    [
      'a web seed',
      `magnet:?${topic}&ws=${encodeURIComponent('https://a.example/')}`,
    ],
    [
      'an exact source',
      `magnet:?${topic}&xs=${encodeURIComponent('https://a.example/a.torrent')}`,
    ],
    [
      'an acceptable source',
      `magnet:?${topic}&as=${encodeURIComponent('https://a.example/')}`,
    ],
    ['a peer address', `magnet:?${topic}&x.pe=a.example:6881`],
    [
      'an upper-case parameter name',
      `magnet:?${topic}&WS=${encodeURIComponent('https://a.example/')}`,
    ],
    [
      'an http tracker',
      `magnet:?${topic}&tr=${encodeURIComponent('http://t.example/announce')}`,
    ],
    [
      'a udp tracker',
      `magnet:?${topic}&tr=${encodeURIComponent('udp://t.example:80')}`,
    ],
    ['an unparseable tracker', `magnet:?${topic}&tr=%`],
  ])('rejects %s', (_label, value) => {
    expect(isSafeMagnetUri(value)).toBe(false)
  })
})
