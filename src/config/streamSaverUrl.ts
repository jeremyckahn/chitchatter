export const streamSaverUrl =
  process.env.STREAMSAVER_URL ??
  // If you would like to host your own Chitchatter instance with an
  // alternative StreamSaver fork to facilitate file sharing, change this
  // string to its respective .mitm.html URL.
  //
  // See: https://github.com/jimmywarting/StreamSaver.js?#configuration
  'https://jeremyckahn.github.io/StreamSaver.js/mitm.html'
