# Chitchatter

![Chitchatter logo](./public/logo/logo.svg)

<sub>Logo provided by [@ramyashreeshetty](https://github.com/ramyashreeshetty)</sub>

Chitchatter is a free (as in both price and freedom) communication tool. Designed to be the simplest way to connect with others privately and securely, it is:

- Fully open source (licensed under [GPL v2](./LICENSE))
- Peer-to-peer
  - Whenever possible, otherwise a TURN server is used to ensure reliable peer connection
- End-to-end encrypted (via [WebRTC](https://webrtc-security.github.io/))
- Ephemeral
  - Message content is never persisted to disk on either the client or server
- Decentralized
  - **No API server required**. Chitchatter works completely without an API server - all that's required for basic functionality is availability of GitHub for static assets, and public WebTorrent and TURN relay servers for establishing peer-to-peer communication. An optional API server is available to provide enhanced connectivity features, but users can always choose to use Chitchatter without it.
- Embeddable
- [Self-hostable](#self-hosting)

Chitchatter uses [Vite](https://vitejs.dev/). The secure networking and streaming magic would not be possible without [Trystero](https://github.com/dmotz/trystero). File transfer functionality is powered by [`secure-file-transfer`](https://github.com/jeremyckahn/secure-file-transfer).

## Status

- [![Known Vulnerabilities](https://snyk.io/test/github/jeremyckahn/chitchatter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jeremyckahn/chitchatter?targetFile=package.json)

## How to use it

Open <https://chitchatter.im/> and join a room to start chatting with anyone else who is in the room. By default, room names are random [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier)s that are generated client-side. To privately communicate with someone, it is recommended to join one of these randomly-generated rooms and share the URL (via the "🔗" button at the top of the page) to whomever you wish to communicate with via a secure medium of your choosing (such as [Burner Note](https://burnernote.com/) or [Yopass](https://yopass.se/)). Your user name will be presented to you, and it would be good to share that with who you will be chatting with beforehand so they know they're talking to you.

**No API server required**: Chitchatter works completely without any API server or backend infrastructure. All communication happens directly between your browser and other users' browsers. While an optional API server is available for enhanced connectivity features, you can always use Chitchatter without it.

## Features

- Multiple peers per room (limited only by the number of peer connections your browser supports).
- Public and private rooms.
- Video and audio chatting.
- Screen sharing.
- Direct messaging.
- File sharing:
  - Unlimited file size transfers.
  - Files are encrypted prior to sending and decrypted by the receiver (the key is the room name).
- Embedding into other web apps via `iframe`.
- Markdown support via [`react-markdown`](https://github.com/remarkjs/react-markdown).
  - Includes support for syntax highlighting of code.
- Conversation backfilling from peers when a new participant joins.
- Multiline message support (hold `shift` and press `enter`).
- Dark and light themes.
- Automatic peer verification via client-side [public-key cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography).

## Anti-features

- Messages are never persisted to disk. When you leave a peer room, messages are cleared from memory and cannot be retrieved.
- Chitchatter is an entirely client-side communication app. It uses public WebTorrent servers to establish peer connections and TURN relay servers when direct peer-to-peer connections cannot be established, but there is no Chitchatter API server.
- No analytics, tracking, or telemetry of any kind.
- This is a community-driven and unfunded project that makes no money. The users come first and there is no corporate influence or financial interest involved.

## Why another chat app?

There is no shortage of user-friendly chat apps available, but they rely on a central service to facilitate communication. It is difficult to trust these central services, as commercial interests and [government pressure](https://www.npr.org/2022/08/12/1117092169/nebraska-cops-used-facebook-messages-to-investigate-an-alleged-illegal-abortion) can compel service operators to work against the best interest of the users. Even when user data is handled in good faith by service operators, the possibility remains that [encrypted data held at rest may be decrypted](https://www.cbsnews.com/news/fbi-may-have-found-way-to-unlock-san-bernardino-shooters-iphone/) against the user's will.

Chitchatter designs around these risks with a [web mesh architecture](https://dev.to/jeremyckahn/taking-the-power-back-with-web-meshes-omg). There is no central service operator that stores or potentially mishandles communication data. Some services are required to establish an initial connection between peers, but otherwise the app uses direct peer-to-peer communication for everything. Any services that are used by Chitchatter have no association with the project and are publicly available for all to use.

## Use cases

Chitchatter offers a private and secure solution for:

- Organizing groups of people, such as unions or political movements
- Conveniently moving text or data from one device to another
- Video chatting with friends and family across operating systems (such as Android and iOS)
- IT troubleshooting via screen sharing
- Livestreaming
- Sharing sensitive information such as passwords
- Much more!

---

## Note from the developer

### 💻️ Project status

I consider Chitchatter feature-complete inasmuch it does all the things I personally need it to do. I don't have specific plans to add significant functionality in the future, but I may do so if it seems fun to me at the time. **I am committed to fixing any significant bugs** that are reported, so please [open an issue](https://github.com/jeremyckahn/chitchatter/issues/new) if you discover one! Aside from that, Chitchatter is effectively in maintenance mode for the foreseeable future.

If you would like a feature to be implemented and are willing to pay a development cost to ensure it gets done, please file a GitHub issue describing the feature and indicate that you are willing to compensate for the work. If you are not willing to pay, please open a GitHub issue regardless. I may implement it if it seems fun to do so, but other members of the community may also step up to implement it via Pull Requests.

I will always make time support Pull Requests from others. If you're willing to put in the work to improve Chitchatter, I am willing to help shepherd that work along and get it shipped.

If you don't agree with the direction of the project, you are welcome to fork Chitchatter and take it in another one.

### 🏗️ Support and custom development

I'm willing to do paid installations and customizations of Chitchatter for your needs. If you'd like to contract me to make a version of Chitchatter that is custom built for you, please email me at <me@jeremyckahn.com> and let me know what you have in mind to get started.

---

## Veracity

The core of Chitchatter's security model is the fact that it is fully open source. You are free (and encouraged) to fully audit the project source code and infrastructure. Not only is the source code available under the terms of the [GPL](./LICENSE), but [all build logs are publicly accessible](https://github.com/jeremyckahn/chitchatter/actions/workflows/pages/pages-build-deployment) as well.

If you would like to verify that the app hosted at <https://chitchatter.im/> is the one that is hosted on GitHub, you can use `dig`:

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

## Project roadmap

See the full ticket backlog [here](https://github.com/users/jeremyckahn/projects/1).

## Environments

- Production environment: <https://chitchatter.im/>
  - Mirror: <https://chitchatter.vercel.app/> (note that peers cannot connect across domains)
- Staging: <https://chitchatter-git-develop-jeremyckahn.vercel.app/>

## SDK

You can use the official Chitchatter SDK to embed the app as a [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) called `<chat-room />`.

```html
<script src="https://chitchatter.im/sdk.js"></script>

<chat-room />
```

The `<chat-room />` component supports the following optional attributes:

- `room`: The name of the Chitchatter room the user should join. The default value is the URL of the embedding page.
- `user-name`: The friendly name of the user (which they can change).
- `user-id`: The static ID of the user. The default value is a random UUID.
- `root-url`: The URL of the Chitchatter instance to use. The default value is `https://chitchatter.im/`.
- `color-mode`: `light` or `dark`. The default value is `dark`.
- `play-message-sound`: Whether or not to play a sound when a user receives a message while the window is not in focus. The default value is `false`.

As well as the following [standard `<iframe />` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes):

- `height`
- `width`
- `style`
- `referrerpolicy`
- `sandbox`

## Developing Chitchatter

> [!IMPORTANT]
> Presently Chitchatter can only be developed on \*NIX systems such as Linux and macOS. If you are using Windows, you can use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to set up a Linux environment.

To make changes to Chitchatter, clone the source code from GitHub. Ensure you have [Node and NPM](https://nodejs.org) installed. Then in the project directory, run:

```
npm install
```

This will install all of the dependencies.

#### Hash-based routing

By default, Chitchatter uses [`BrowserRouter`](https://api.reactrouter.com/v7/functions/react_router.BrowserRouter.html) for handling routing. If you need to support environments where server-side routing configuration is neither possible (like some static site hosts) nor desirable (to prevent the server from seeing the room name), you can enable hash-based routing.

To enable hash-based routing, set the following environment variable in your `.env` file:

```
VITE_ROUTER_TYPE=hash
```

The supported values are `hash` and `browser` (the default).

When this is set, the app will use [`HashRouter`](https://api.reactrouter.com/v7/functions/react_router.HashRouter.html), and all routes will be prefixed with a `#` (e.g., `https://chitchatter.im/#/public/some-room`).

### Available Scripts

In the project directory, you can run:

#### `npm dev`

Runs the entire stack (client + WebTorrent tracker) locally.

#### `npm start`

Runs the front end app in the development mode. Uses public WebTorrent trackers. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.

#### `npm run build`

Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### API Configuration

**Note: The API server is completely optional.** Chitchatter works without any API server - users can connect and communicate without TURN relay servers if their collective network conditions allow for it. The API configuration described below is available for deployments that want to provide enhanced connectivity features for users in a wider variety of network conditions.

Chitchatter uses a hybrid approach for WebRTC configuration:

- **TURN servers**: Fetched from the API endpoint (configurable via `VITE_RTC_CONFIG_ENDPOINT`, defaults to `/api/get-config`) with data configured via `RTC_CONFIG` environment variable
- **Final configuration**: The frontend uses the configuration from the API to create the complete RTCConfiguration

This separation allows for flexible configuration where TURN servers (which often require credentials and may change) are managed server-side.

#### Enhanced Connectivity Feature

The Enhanced Connectivity feature is an **optional enhancement** that allows users to toggle the use of external TURN servers for improved connection reliability. **Chitchatter works perfectly without this feature** - it's simply an additional option for deployments that want to provide enhanced connectivity. This feature is **conditionally available** based on your deployment configuration:

- **Available**: When `VITE_RTC_CONFIG_ENDPOINT` environment variable is set
- **Unavailable**: When `VITE_RTC_CONFIG_ENDPOINT` is not set or empty

**When Enhanced Connectivity is available:**

- Users see a "Networking" section in Settings with a toggle for "Enhanced connectivity"
- When enabled, the app fetches TURN server configuration from the API endpoint
- When disabled, the app uses fallback TURN servers only

**When Enhanced Connectivity is unavailable:**

- The "Networking" section is hidden from the Settings page
- The feature is treated as permanently disabled (uses fallback TURN servers)
- A console warning is shown to help self-hosters understand how to enable the feature

This conditional behavior ensures that self-hosters who don't configure external TURN servers don't see confusing UI options that won't work for their setup.

> [!NOTE]
> All environment variables and their configuration options are documented in the `.env` file with detailed explanations and examples. Refer to that file for comprehensive configuration guidance.

#### Development Environment

When running `npm run dev`, the development stack includes:

- **Frontend**: Vite dev server on port 3000
- **API**: Vercel dev server on port 3001 (proxied through Vite)
- **Tracker**: WebTorrent tracker on port 8000
- **StreamSaver**: File download service on port 3015

The Vite development server automatically proxies `/api/*` requests to the Vercel dev server running on port 3001.

#### Alternative Development Setup

If you prefer to use the simple API server instead of Vercel dev:

1. **Start the simple API server**:

   ```bash
   node simple-api-server.js
   ```

   This runs on port 3003 by default.

2. **Configure environment variables**:
   Edit `.env` and uncomment:

   ```bash
   VITE_API_BASE_URL=http://localhost:3003
   ```

3. **Start the frontend**:

   ```bash
   npm start
   ```

#### RTC Configuration Helper Script

**🔒 Security Note**: Never commit real TURN server credentials to version control! Always generate your own configuration with your own TURN server credentials.

To simplify the process of creating the base64-encoded `RTC_CONFIG` environment variable, use the included helper script:

```bash
npm run generate-rtc-config
```

This interactive script will:

- Guide you through adding TURN servers
- Provide preset configurations for common setups
- Generate the properly formatted base64-encoded string
- Show usage instructions for different deployment platforms

**Quick start with presets:**

- **Option 1**: Custom TURN server - Configure with your own TURN credentials
- **Option 2**: Custom configuration - Full control over all servers

**Script options:**

```bash
# Interactive configuration generator
npm run generate-rtc-config

# Show help
npm run generate-rtc-config -- --help

# Show example configurations
npm run generate-rtc-config -- --example
```

**Verifying your configuration:**

```bash
# Decode and verify the generated base64 string
echo "eyJpY2VTZXJ2ZXJzIjpb..." | base64 -d | jq .

# Example output (with your own credentials):
# {
#   "iceServers": [
#     {
#       "urls": "turn:your-turn-server.com:3478",
#       "username": "your-username",
#       "credential": "your-credential"
#     }
#   ]
# }
```

#### Production Environment

**🔒 Security Important**: Never commit real TURN server credentials to version control! Always use GitHub repository secrets or environment variables for sensitive configuration.

In production (GitHub Pages deployment), configure both server-side and client-side components:

**Server-side (TURN servers)**: Set the `RTC_CONFIG` environment variable with a base64-encoded JSON string containing your full RTCConfiguration. The API will extract and return only the TURN server:

```bash
# Method 1: Use the helper script (recommended)
npm run generate-rtc-config

# Method 2: Manual creation (advanced users)
echo '{"iceServers":[{"urls":"turn:your-turn-server.com:3478","username":"your-username","credential":"your-password"}]}' | base64 -w 0

# Set in GitHub repository environment variables or secrets (replace with your actual config)
RTC_CONFIG=<your-base64-encoded-rtc-config-here>
```

If `RTC_CONFIG` is not set, the API will fall back to a default TURN server.

**For self-hosters**: If you don't set `VITE_RTC_CONFIG_ENDPOINT`, the Enhanced Connectivity feature will be automatically disabled and hidden from users. This prevents confusion when external TURN server configuration is not available. To enable Enhanced Connectivity, set `VITE_RTC_CONFIG_ENDPOINT` to your API endpoint (defaults to `/api/get-config` if you set it to any truthy value).

### Self-hosting

Chitchatter is designed to be forked and self-hosted. If you would like to change pairing or relay server configuration or you prefer to control your own builds and versions, [fork this repo](https://github.com/jeremyckahn/chitchatter/fork) and follow the steps below.

> [!IMPORTANT]
> Chitchatter peer connections are bound to the instance's domain. So, a user of Chitchatter at <https://chitchatter.im/> would not be able to connect to a user of a Chitchatter instance on another domain (such as a personal GitHub Pages-hosted fork).

#### Necessary steps after forking

Assuming you are hosting Chitchatter on [GitHub Pages](https://pages.github.com/):

1. Change the [`homepage` property in `package.json`](https://github.com/jeremyckahn/chitchatter/blob/1ea67e2c3a45115e054ebfe3457f2c3572c6213b/package.json#L4) to whatever URL your Chitchatter instance will be hosted from. This will be something like `https://github_user_or_org_name.github.io/chitchatter/`. **This string must contain a trailing slash**.
2. Define a [`DEPLOY_KEY` GitHub Action secret](https://github.com/jeremyckahn/chitchatter/blob/e2bac732cf1288f7b5d0bec151098f18e8b1d0d6/.github/workflows/deploy.yml#L28-L31) (at `https://github.com/github_user_or_org_name/chitchatter/settings/secrets/actions`). See the docs for [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages#%EF%B8%8F-set-ssh-private-key-deploy_key) for more information.
3. In the Pages section of your fork's Settings tab, ensure that "Deploy from a branch" is selected for Source, and that the branch source is `gh-pages` with `/ (root)`.
4. If you're using GitHub Pages [without a custom domain](https://github.com/sitek94/vite-deploy-demo?tab=readme-ov-file#fix-assets-links), you'll need to define the repo name as the `base` property [in `vite.config.ts`](https://github.com/jeremyckahn/chitchatter/blob/df6d10868e12ad13036a44f959796f4da35adc28/vite.config.ts#L35-L38). Here's an example of how that might look:

```js
const config = () => {
   return defineConfig({
      base: '/chitchatter/',
      build: {
      // ...
}
```

#### Deployment

##### On GitHub

When hosted on GitHub Pages and the configuration above has been done, the Production environment is updated when the remote `main` branch is updated (once GitHub Actions are enabled).

##### On non-GitHub hosts

Build the app with `npm run build`, and then serve the `dist` directory. Any static file serving solution should work provided it is using a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).

#### Runtime configuration

Explore the files in `src/config` to modify pairing and relay server configuration.

#### Theme customization

Chitchatter utilizes the [MUI component library](https://mui.com/) which is [themeable](https://mui.com/material-ui/customization/theming/). You can customize Chitchatter's look and feel by modifying [the shell theme definition](https://github.com/jeremyckahn/chitchatter/blob/dc78137702bb9d6bf1be289e469e080cd7d5dc8b/src/components/Shell/useShellTheme.ts#L11-L18).

### Troubleshooting

If you run into any issues with a custom Chitchatter installation, first ensure that you are using [the latest version of the code](https://github.com/jeremyckahn/chitchatter/tree/main). If you are hosting your installation with GitHub Pages, sync your `main` branch and _not_ your `gh-pages` branch. Updating your `main` branch will trigger a proper rebuild of your `gh-pages` branch.

- <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork>

#### Peers won't connect

This could happen for a variety of reasons. The most likely of which is that one or more peers cannot connect directly and must use the configured TURN relay as a fallback. The standard relay is free and does not guarantee any level of service, so it may simply be unavailable for some time (or just not work at all for some users). There's not much to do other than wait until it becomes available again, or possibly try from another device or location.

##### Issues specific to browsers with ad blocking extensions

Some ad blockers (such as uBlock Origin) prevent connections to certain WebTorrent servers. This prevents Chitchatter peers from connecting. To work around this, you can either disable your ad blocker or [self-host your own Chitchatter instance](#self-hosting).

##### Issues specific to iOS Safari

Chitchatter works on iOS Safari, but browser-level bugs often prevent peers from rejoining the room when the browser is closed and later reopened (for instance, when switching applications). The suggested workaround for this issue is to refresh the page to rejoin the room.

##### Issues specific to Firefox

Per [#36](https://github.com/jeremyckahn/chitchatter/issues/36), check your `about:config` settings and ensure that `media.peerconnection.enabled` is **enabled**.

#### Offered files can't be downloaded from peers

Chitchatter uses [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js) to facilitate large file transfers. Download managers such as [FDM](https://www.freedownloadmanager.org/) are [known to interfere with StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js/issues/325), so it is recommended to disable such download managers when trying to receive files.

### Contributors

<p align="center">
<a href="https://github.com/jeremyckahn/chitchatter/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=jeremyckahn/chitchatter" />
</a>
</p>

## ⚠️ [Disclaimer](https://chitchatter.im/disclaimer)

By using Chitchatter, you agree to accept **full responsibility** for your actions related to its use. Additionally, you agree **not** to hold any contributors to the Chitchatter project responsible for any result of your use of it. The developers of Chitchatter do not endorse illegal activity.
