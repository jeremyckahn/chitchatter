/**
 * Simple API Server for Chitchatter WebRTC Configuration
 *
 * This lightweight HTTP server provides WebRTC configuration data to enable
 * peer-to-peer connections in the Chitchatter messaging application.
 *
 * PURPOSE:
 * Chitchatter is a browser-based, peer-to-peer encrypted messaging app that
 * connects users directly without storing messages on servers. To establish
 * these P2P connections, browsers need WebRTC configuration including STUN/TURN
 * servers for NAT traversal and firewall penetration.
 *
 * FUNCTIONALITY:
 * - Serves WebRTC configuration via GET /api/get-config endpoint
 * - Loads RTC config from RTC_CONFIG environment variable (base64 encoded JSON)
 * - Falls back to hardcoded config if environment variable is missing/invalid
 * - Validates RTC configuration format to ensure compatibility
 * - Implements CORS security to restrict access to authorized Chitchatter domains
 *
 * USAGE CONTEXT:
 * This server is primarily used for:
 * - Development environments where developers need local RTC config
 * - Self-hosted Chitchatter deployments that require custom STUN/TURN servers
 * - Testing different WebRTC configurations without rebuilding the frontend
 *
 * The main Chitchatter app runs entirely in the browser, but WebRTC connections
 * often require TURN servers (relay servers) to work through restrictive firewalls.
 * This API allows dynamic configuration of those servers without hardcoding
 * credentials in the client-side code.
 *
 * SECURITY NOTES:
 * - CORS headers restrict access to approved Chitchatter domains
 * - Debug mode (CORS_ALLOW_ALL=true) should only be used in development
 * - TURN server credentials are sensitive and should be rotated regularly
 */

import { createServer } from 'http'
import { Buffer } from 'buffer'

// Fallback rtcConfig in case environment variable is missing or invalid
const fallbackRtcConfig = {
  iceServers: [
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efQUQ79N77B5BNVVKF',
      credential: 'N4EAUgpjMzPLrxSS',
    },
    // Free Google STUN server for basic NAT traversal.
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
}

// Validate that the decoded data conforms to RTCConfiguration interface
function isValidRTCConfiguration(data) {
  if (!data || typeof data !== 'object') {
    return false
  }

  if (!Array.isArray(data.iceServers)) {
    return false
  }

  // Validate each ice server
  for (const server of data.iceServers) {
    if (!server || typeof server !== 'object') {
      return false
    }

    // urls is required and can be string or string[]
    if (!server.urls) {
      return false
    }

    if (typeof server.urls !== 'string' && !Array.isArray(server.urls)) {
      return false
    }

    if (Array.isArray(server.urls)) {
      if (!server.urls.every(url => typeof url === 'string')) {
        return false
      }
    }

    // username and credential are optional but if present must be strings
    if (server.username !== undefined && typeof server.username !== 'string') {
      return false
    }

    if (
      server.credential !== undefined &&
      typeof server.credential !== 'string'
    ) {
      return false
    }
  }

  return true
}

// Load and validate rtcConfig from environment variable
function getRtcConfig() {
  const rtcConfigEnv = process.env.RTC_CONFIG

  if (!rtcConfigEnv) {
    if (!process.env.IS_E2E_TEST) {
      console.error(
        'RTC_CONFIG environment variable is not set. Using fallback configuration.'
      )
    }

    return fallbackRtcConfig
  }

  try {
    // Base64 decode the environment variable
    const decodedConfig = Buffer.from(rtcConfigEnv, 'base64').toString('utf-8')
    const parsedConfig = JSON.parse(decodedConfig)

    // Validate the parsed configuration
    if (!isValidRTCConfiguration(parsedConfig)) {
      console.error(
        'Invalid RTC configuration format in environment variable. Configuration must conform to RTCConfiguration interface. Using fallback configuration.'
      )
      return fallbackRtcConfig
    }

    return parsedConfig
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(
        'Failed to parse RTC_CONFIG environment variable as JSON:',
        error.message,
        'Using fallback configuration.'
      )
    } else {
      console.error(
        'Failed to decode RTC_CONFIG environment variable:',
        error,
        'Using fallback configuration.'
      )
    }
    return fallbackRtcConfig
  }
}

// CORS configuration
const allowedOrigins = [
  'https://chitchatter.im',
  'https://chitchatter.vercel.app',
  'https://chitchatter-git-develop-jeremyckahn.vercel.app',
  'http://localhost:3000', // Development frontend
  'http://localhost:3001', // API development
  'http://localhost:3003', // Simple API server
]

function getCorsOrigin(req) {
  // Check for debug override first
  if (process.env.CORS_ALLOW_ALL === 'true') {
    return '*'
  }

  // Production mode: Restrict to allowed domains
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    return origin
  }
  // For same-origin requests or allowed deployments, use the primary domain
  return 'https://chitchatter.im'
}

// API handler function
function handleGetConfig(req, res) {
  console.log(`API handler called with method: ${req.method}`)

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`Method ${req.method} not allowed, returning 405`)
    res.writeHead(405, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  // Set CORS headers - restrict to same domain for security (unless debug override is enabled)
  const corsOrigin = getCorsOrigin(req)
  res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (corsOrigin === '*') {
    console.log('CORS headers set with wildcard origin (DEBUG MODE - INSECURE)')
  } else {
    console.log('CORS headers set with restricted origin')
  }

  // Get rtcConfig from environment variable with validation
  const rtcConfig = getRtcConfig()
  console.log('Retrieved RTC config:', JSON.stringify(rtcConfig, null, 2))

  // Set content type explicitly
  res.setHeader('Content-Type', 'application/json')
  console.log('Content-Type header set to application/json')

  // Return the rtcConfig as JSON
  console.log('Returning RTC config as JSON response')
  res.writeHead(200)
  res.end(JSON.stringify(rtcConfig))
}

// Create HTTP server
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  console.log(`${req.method} ${url.pathname}`)

  // Handle API routes
  if (url.pathname === '/api/get-config') {
    handleGetConfig(req, res)
    return
  }

  // Handle other routes (404)
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(req),
  })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const PORT = process.env.PORT || 3003

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Simple API server running at http://127.0.0.1:${PORT}`)
  console.log(
    `📡 RTC Config API available at http://127.0.0.1:${PORT}/api/get-config`
  )
  console.log(`🔧 To test: curl http://127.0.0.1:${PORT}/api/get-config`)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down API server...')
  server.close(() => {
    console.log('✅ API server stopped')
    process.exit(0)
  })
})
