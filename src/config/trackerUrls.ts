let trackerUrls: string[] | undefined = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.files.fm:7073/announce',
]

if (import.meta.env.VITE_TRACKER_URL) {
  trackerUrls.unshift(import.meta.env.VITE_TRACKER_URL)
}

if (!trackerUrls.length) {
  trackerUrls = undefined
}

export { trackerUrls }
