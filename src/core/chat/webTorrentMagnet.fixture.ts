/**
 * A magnet URI exactly as WebTorrent writes one for a file this app shares on a
 * deployment that configures no tracker of its own, which is how it is hosted
 * by default: `create-torrent` falls back to its default announce list, so the
 * magnet carries five `udp://` trackers as well as two `wss://` ones.
 *
 * Captured from `create-torrent` and `parse-torrent`'s `toMagnetURI` rather than
 * composed by hand, because a hand-written magnet is only as faithful as what
 * its author remembered. A host that sets trackers writes `ws(s)://` ones only,
 * which is all the end-to-end tests ever produce.
 */
export const webTorrentDefaultMagnetUri =
  'magnet:?xt=urn:btih:cc8497540d32a8d2898f613c239500a5da1a0053&dn=cat.jpg' +
  '&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969' +
  '&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969' +
  '&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337' +
  '&tr=udp%3A%2F%2Fexplodie.org%3A6969' +
  '&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337' +
  '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
  '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com'
