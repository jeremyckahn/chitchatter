# Chitchatter

Chitchatter is a free (as in both price and freedom) communication tool. It is designed with security and privacy in mind. To that end, it is:

- Fully open source (licensed under [GPL v2](./LICENSE))
- Peer-to-peer
  - Whenever possible, otherwise [Open Relay](https://www.metered.ca/tools/openrelay/) is used to ensure reliable peer connection
- Encrypted (via [WebRTC](https://webrtc-security.github.io/))
- Serverless
  - [Public WebTorrent servers are only used for initial peer handshake](https://github.com/dmotz/trystero#how-it-works)
- Ephemeral
  - Message content is never persisted to disk
- Decentralized
  - There is no API server. All that's required for Chitchatter to function is availability of GitHub for static assets and public WebTorrent and STUN/TURN relay servers for establishing communication.

Chitchatter was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## How to use it

Open https://chitchatter.im/ and join a room to start chatting with anyone else who is in the room. By default, room names are random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier)s that are generated client-side. To securely communicate with someone, it is recommended to join one of these randomly-generated rooms and share the URL (via the "🔗" button at the top of the page) to whoever you wish to communicate with via a secure medium of your choosing (such as [Burner Note](https://burnernote.com/) or [Yopass](https://yopass.se/)). Your static user name will be presented to you, and it would be good share that with who you will be chatting with so they know they're talking to you.

Some things to keep in mind:

- Messages disappear as soon as you leave the chat room.
- The number displayed at the top-right of the screen shows how many peers you are connected to. Your peers are the only ones who can see your message.
- Chitchatter supports Markdown, including syntax highlighting for code.

## Why another chat app?

There is no shortage of user-friendly chat apps available, but most of them rely on a central service to facilitate communication. It is difficult to trust these central services, as commercial interests and [government pressure](https://www.npr.org/2022/08/12/1117092169/nebraska-cops-used-facebook-messages-to-investigate-an-alleged-illegal-abortion) can compel service operators to work against the best interest of the users. Even when when user data is handled in good faith by service operators, the possibility remains that [encrypted data held at rest may be decrypted](https://www.cbsnews.com/news/fbi-may-have-found-way-to-unlock-san-bernardino-shooters-iphone/) against the user's will.

Chitchatter designs around these concerns by not having a central service operator and never storing communication data. Some services are required to establish a connection between peers, but the app relies on direct peer-to-peer communication as much as possible. Any services that are used by the app have no association with Chitchatter project and are publicly available for all to use.

Chitchatter is inspired by [Cryptocat](https://en.wikipedia.org/wiki/Cryptocat).

### Veracity

The core of Chitchatter's security model is the fact that it is fully open source. You are free (and encouraged) to fully audit the project source code and infrastructure. Not only is the source code available under the terms of the [GPL](./LICENSE), but [all build logs are publicly accessible](https://github.com/jeremyckahn/chitchatter/actions/workflows/pages/pages-build-deployment) as well.

If you would like to verify that the app hosted at https://chitchatter.im/ is the one that is hosted on GitHub, you can use `dig`:

```
$ dig chitchatter.im

; <<>> DiG 9.18.1-1ubuntu1.1-Ubuntu <<>> chitchatter.im
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 61332
;; flags: qr rd ra; QUERY: 1, ANSWER: 5, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 65494
;; QUESTION SECTION:
;chitchatter.im.                        IN      A

;; ANSWER SECTION:
chitchatter.im.         231     IN      CNAME   jeremyckahn.github.io.
jeremyckahn.github.io.  231     IN      A       185.199.111.153
jeremyckahn.github.io.  231     IN      A       185.199.110.153
jeremyckahn.github.io.  231     IN      A       185.199.109.153
jeremyckahn.github.io.  231     IN      A       185.199.108.153
```

To examine the static assets that are served to end users, you can audit the [`gh-pages` branch](https://github.com/jeremyckahn/chitchatter/tree/gh-pages).

## Project status

Chitchatter is in [MVP](https://en.wikipedia.org/wiki/Minimum_viable_product) state. A lot of basic features and UX polish are missing, but [much is planned](#Project-roadmap) for the future.

Chitchatter is an open source project, so community contributions and support are welcome! If there's something you'd like to see changed in the project, please [open an issue](https://github.com/jeremyckahn/chitchatter/issues) or [Pull Request](https://github.com/jeremyckahn/chitchatter/pulls) on GitHub and share your ideas.

## Project roadmap

This is a non-exhaustive list of things that are in Chitchatter's future:

- Password-protected rooms
- Voice calling
- Video calling
- File sharing
- Pairing and relay server configuration
- Indicators for when others are typing
- Transcript backfilling for peers who join a room after there has already been activity

## Available Scripts

In the project directory, you can run:

### `npm dev`

Runs the entire stack (client + WebTorrent tracker) locally.

### `npm start`

Runs the front end app in the development mode. Uses public WebTorrent trackers.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode. See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### Deployment

The Production environment is updated when the `main` branch is updated.
