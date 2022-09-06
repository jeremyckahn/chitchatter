# Chitchatter

Chitchatter is a free (as in both price and freedom) communication tool. It is designed with security and privacy in mind. To that end, it is:

- Fully open source
- Peer-to-peer
  - Whenever possible, otherwise [Open Relay](https://www.metered.ca/tools/openrelay/) is used to ensure reliable peer connection
- Encrypted (via [WebRTC](https://webrtc-security.github.io/))
- Serverless
  - [Public WebTorrent servers are only used for initial peer handshake](https://github.com/dmotz/trystero#how-it-works)
- Ephemeral
  - Message content is never persisted to disk
- Decentralized
  - There is no API server. All that's required for Chitchatter to function is availability of GitHub for static assets, and public WebTorrent and relay servers for establishing communication.

Chitchatter was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm dev`

Runs the entire stack (client + WebTorrent tracker) locally.

### `npm start`

Runs the front end app in the development mode. Uses public WebTorrent trackers.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### Deployment

The Production environment is updated when the `main` branch is updated.
