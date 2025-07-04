import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * TURN Server Configuration Handler
 *
 * This handler loads TURN server configuration from the RTC_CONFIG environment variable.
 * The environment variable should contain a base64-encoded JSON string that includes
 * the full RTCConfiguration, but this endpoint extracts and returns only the TURN server.
 *
 * To create the environment variable:
 *
 * RECOMMENDED: Use the helper script to generate the configuration:
 * 1. Run: npm run generate-rtc-config
 * 2. Follow the interactive prompts to configure STUN/TURN servers
 * 3. Copy the generated base64 string and set as RTC_CONFIG environment variable
 *
 * ALTERNATIVE: Manual creation:
 * 1. Create your RTCConfiguration object as JSON (including both STUN and TURN servers)
 * 2. Base64 encode it: Buffer.from(JSON.stringify(config)).toString('base64')
 * 3. Set RTC_CONFIG="<base64-encoded-string>"
 *
 * Example:
 * const config = {
 *   iceServers: [
 *     { urls: 'stun:stun.l.google.com:19302' },
 *     { urls: 'turn:example.com:3478', username: 'user', credential: 'pass' }
 *   ]
 * }
 * RTC_CONFIG="eyJpY2VTZXJ2ZXJzIjpb..."
 *
 * The endpoint will return only the TURN server configuration:
 * { urls: 'turn:example.com:3478', username: 'user', credential: 'pass' }
 *
 * If the environment variable is missing, malformed, or invalid, the handler
 * will fall back to the default TURN server configuration.
 *
 * CORS SECURITY:
 * By default, this endpoint restricts cross-origin requests to allowed domains only.
 * For debugging purposes, you can override this by setting CORS_ALLOW_ALL="true"
 * to allow requests from any origin (INSECURE - use only for debugging).
 */

// Fallback TURN server configuration in case environment variable is missing or invalid
// 🔒 SECURITY NOTE: These are example credentials for demonstration purposes only.
// In production, you should replace these with your own TURN server credentials
// or ensure that RTC_CONFIG environment variable is properly configured.
const fallbackTurnServer: RTCIceServer = {
  urls: 'turn:relay1.expressturn.com:3478',
  username: 'efQUQ79N77B5BNVVKF',
  credential: 'N4EAUgpjMzPLrxSS',
}

// Validate URL format for STUN/TURN servers
const isValidIceServerUrl = (url: string): boolean => {
  return /^(stun|turn|turns):.+/.test(url)
}

// Validate that the decoded data conforms to RTCConfiguration interface
const isValidRTCConfiguration = (data: any): data is RTCConfiguration => {
  if (!data || typeof data !== 'object') {
    console.error('RTC configuration is not a valid object')
    return false
  }

  if (!Array.isArray(data.iceServers)) {
    console.error('RTC configuration missing iceServers array')
    return false
  }

  if (data.iceServers.length === 0) {
    console.error('RTC configuration has empty iceServers array')
    return false
  }

  // Validate each ice server
  for (const server of data.iceServers) {
    if (!server || typeof server !== 'object') {
      console.error('Invalid ice server object:', server)
      return false
    }

    // urls is required and can be string or string[]
    if (!server.urls) {
      console.error('Ice server missing urls property')
      return false
    }

    if (typeof server.urls !== 'string' && !Array.isArray(server.urls)) {
      console.error('Ice server urls must be string or array of strings')
      return false
    }

    const urlsArray = Array.isArray(server.urls) ? server.urls : [server.urls]

    if (
      !urlsArray.every(
        (url: any) => typeof url === 'string' && isValidIceServerUrl(url)
      )
    ) {
      console.error('Invalid ice server URLs:', urlsArray)
      return false
    }

    // username and credential are optional but if present must be strings
    if (server.username !== undefined && typeof server.username !== 'string') {
      console.error('Ice server username must be a string')
      return false
    }

    if (
      server.credential !== undefined &&
      typeof server.credential !== 'string'
    ) {
      console.error('Ice server credential must be a string')
      return false
    }
  }

  return true
}

// Extract TURN server from RTCConfiguration
const extractTurnServer = (
  rtcConfig: RTCConfiguration
): RTCIceServer | null => {
  if (!rtcConfig.iceServers) {
    return null
  }

  for (const server of rtcConfig.iceServers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]

    // Check if any of the URLs is a TURN server
    if (urls.some(url => url.startsWith('turn:'))) {
      return server
    }
  }

  return null
}

// Load and extract TURN server from environment variable
const getTurnServer = (): RTCIceServer => {
  const rtcConfigEnv = process.env.RTC_CONFIG

  if (!rtcConfigEnv) {
    console.warn(
      'RTC_CONFIG environment variable is not set. Using fallback TURN server.'
    )
    return fallbackTurnServer
  }

  if (!rtcConfigEnv.trim()) {
    console.error(
      'RTC_CONFIG environment variable is empty. Using fallback TURN server.'
    )
    return fallbackTurnServer
  }

  try {
    // Base64 decode the environment variable
    const decodedConfig = Buffer.from(rtcConfigEnv, 'base64').toString('utf-8')

    if (!decodedConfig.trim()) {
      console.error(
        'RTC_CONFIG environment variable decodes to empty string. Using fallback TURN server.'
      )
      return fallbackTurnServer
    }

    const parsedConfig = JSON.parse(decodedConfig)

    // Validate the parsed configuration
    if (!isValidRTCConfiguration(parsedConfig)) {
      console.error(
        'Invalid RTC configuration format in environment variable. Configuration must conform to RTCConfiguration interface. Using fallback TURN server.'
      )
      return fallbackTurnServer
    }

    // Extract TURN server from the configuration
    const turnServer = extractTurnServer(parsedConfig)
    if (!turnServer) {
      console.error(
        'No TURN server found in RTC configuration. Using fallback TURN server.'
      )
      return fallbackTurnServer
    }

    console.log(
      'Successfully loaded TURN server configuration from environment'
    )
    return turnServer
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(
        'Failed to parse RTC_CONFIG environment variable as JSON:',
        error.message,
        'Using fallback TURN server.'
      )
    } else {
      console.error(
        'Unexpected error processing RTC_CONFIG environment variable:',
        error,
        'Using fallback TURN server.'
      )
    }
    return fallbackTurnServer
  }
}

const allowedOrigins = [
  'https://chitchatter.im',
  'https://chitchatter.vercel.app',
  'https://chitchatter-git-develop-jeremyckahn.vercel.app',
  'http://localhost:3000', // Development frontend
  'http://localhost:3001', // API development
  'http://localhost:3003', // Simple API server
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`API handler called with method: ${req.method}`)

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`Method ${req.method} not allowed, returning 405`)
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Set CORS headers - restrict to same domain for security (unless debug override is enabled)
  if (process.env.CORS_ALLOW_ALL === 'true') {
    // Debug mode: Allow all origins (insecure - for debugging only)
    res.setHeader('Access-Control-Allow-Origin', '*')
    console.log('CORS headers set with wildcard origin (DEBUG MODE - INSECURE)')
  } else {
    // Production mode: Restrict to allowed domains
    const origin = req.headers.origin

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else {
      // For same-origin requests or allowed deployments, use the primary domain
      res.setHeader('Access-Control-Allow-Origin', 'https://chitchatter.im')
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    // Get TURN server from environment variable with validation
    const turnServer = getTurnServer()

    // Set content type explicitly
    res.setHeader('Content-Type', 'application/json')

    // Return the TURN server as JSON
    res.status(200).json(turnServer)
  } catch (error) {
    console.error('Unexpected error in API handler:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({ error: 'Internal server error' })
  }
}
