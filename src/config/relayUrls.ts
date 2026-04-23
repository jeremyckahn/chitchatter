let relayUrls: string[] | undefined = [
  // If you would like to host your own Chitchatter instance with alternative
  // Nostr relays to connect peers, add them to this array. This array
  // gets provided to Trystero as the `relayUrls` configuration option:
  // https://github.com/dmotz/trystero#joinroomconfig-namespace
  //
  // See the default relay list for examples of what to use:
  // https://github.com/dmotz/trystero/blob/main/src/nostr.js
]

// If a relay URL has been provided via the VITE_RELAY_URL environment
// variable, prioritize using it. This is mainly relevant for local development
// when using the `npm run dev` script. If you are hosting your own Chitchatter
// instance, consider populating the relayUrls above instead.
if (import.meta.env.VITE_RELAY_URL) {
  relayUrls.unshift(import.meta.env.VITE_RELAY_URL)
}

// If no relay URL overrides have been provided, set relayUrls to undefined
// to allow Trystero to use the default list (linked above).
if (!relayUrls.length) {
  relayUrls = undefined
}

export { relayUrls }
