# Hardened StreamSaver.js

`StreamSaver.js` here is [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js)
2.0.6 (MIT, see `LICENSE`) with security fixes. `vite.config.ts` aliases the
`streamsaver` package to it, so `secure-file-transfer`, which imports
`streamsaver`, picks it up in the dev server, the production build and Vitest.
It is vendored rather than patched at install time, so `npm ci --ignore-scripts`
cannot silently ship the unpatched copy.

## Why

StreamSaver saves a download by posting the decrypted file stream to a hidden
cross-origin "mitm" iframe. Upstream:

1. posts it with targetOrigin `'*'`, so the stream goes to whatever document
   the iframe holds. Any ancestor frame may navigate a descendant frame, so a
   page that embeds Chitchatter could swap the iframe for its own page and
   read the file.
2. loads the `download` URL that the frame replies with into a new iframe (or
   navigates to it) without checking it, so a `javascript:` URL ran in the
   Chitchatter origin.

## Changes

Every change is marked `CHITCHATTER:` in the source:

- The response and its `MessagePort` are posted only to the origin of
  `streamSaver.mitm`.
- A `download` URL is used only if it is an `http:`/`https:` URL on that
  origin; anything else is rejected and logged.
- Iframes it creates send no referrer.
- It is an ES module with a default export instead of a UMD wrapper.

Chitchatter additionally never uses StreamSaver while it is framed (see
`src/services/FileTransfer/saveDownload.ts`).

## Updating

Diff the new upstream release against `node_modules/streamsaver/StreamSaver.js`
for the version above, re-apply the `CHITCHATTER:` changes, and run
`npx vitest run src/services/FileTransfer` plus the file-transfer E2E tests.
