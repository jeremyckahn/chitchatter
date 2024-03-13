let trackerUrls: string[] | undefined = [
  // If you would like to host your own Chitchatter instance with alternative
  // WebTorrent trackers to connect peers, add them to this array. This array
  // gets provided to Trystero as the `trackerUrls` configuration option:
  // https://github.com/dmotz/trystero#joinroomconfig-namespace
  //
  // See the default tracker list for examples of what to use:
  // https://github.com/dmotz/trystero/blob/694f49974974cc9df8b621db09215d6df10fad09/src/torrent.js#L27-L33
]

// If a tracker URL has been provided via the VITE_TRACKER_URL environment
// variable, prioritize using it. This is mainly relevant for local development
// when using the `npm run dev` script. If you are hosting your own Chitchatter
// instance, consider populating the trackerUrls above instead.
if (import.meta.env.VITE_TRACKER_URL) {
  trackerUrls.unshift(import.meta.env.VITE_TRACKER_URL)
}

// If no tracker URL overrides have been provided, set trackerUrls to undefined
// to allow Trystero to use the default list (linked above).
if (!trackerUrls.length) {
  trackerUrls = undefined
}

export { trackerUrls }
