#!/usr/bin/env node

/* eslint-disable react-hooks/rules-of-hooks */

/**
 * RTC Configuration Generator
 *
 * This script helps generate the base64-encoded RTC_CONFIG environment variable
 * needed for the Chitchatter API endpoint. It creates a properly formatted
 * RTCConfiguration object and encodes it for use in deployment environments.
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// ANSI color codes for better CLI experience
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

function validateUrl(url) {
  const stunPattern = /^stun:[^:]+:\d+$/
  const turnPattern = /^turns?:[^:]+:\d+$/
  return stunPattern.test(url) || turnPattern.test(url)
}

async function getServerInput(type) {
  const servers = []

  console.log(colorize(`\n📡 Adding ${type.toUpperCase()} servers:`, 'blue'))
  console.log(
    colorize(
      `Enter ${type} server URLs (press Enter with empty input to finish)`,
      'yellow'
    )
  )

  if (type === 'turn') {
    console.log(
      colorize('Note: TURN servers require username and credential', 'yellow')
    )
  }

  let index = 1
  while (true) {
    const url = await question(`${index}. ${type.toUpperCase()} URL: `)

    if (!url.trim()) {
      break
    }

    if (!validateUrl(url)) {
      console.log(
        colorize(
          `❌ Invalid ${type} URL format. Expected format: ${type}:hostname:port`,
          'red'
        )
      )
      continue
    }

    const server = { urls: url }

    // For TURN servers, get credentials
    if (url.startsWith('turn:') || url.startsWith('turns:')) {
      const username = await question('   Username: ')
      const credential = await question('   Credential: ')

      if (!username || !credential) {
        console.log(
          colorize(
            '❌ TURN servers require both username and credential',
            'red'
          )
        )
        continue
      }

      server.username = username
      server.credential = credential
    }

    servers.push(server)
    console.log(colorize(`✅ Added ${type} server: ${url}`, 'green'))
    index++
  }

  return servers
}

async function usePresetConfig() {
  console.log(colorize('\n🎯 Available presets:', 'blue'))
  console.log('1. Google STUN + Custom TURN server (you provide credentials)')
  console.log('2. Google STUN only')
  console.log('3. Custom configuration')

  const choice = await question('\nSelect preset (1-3): ')

  switch (choice) {
    case '1':
      console.log(
        colorize(
          '\n🔒 Security Note: Never use example credentials in production!',
          'red'
        )
      )
      console.log('You need to provide your own TURN server credentials.\n')

      const turnUrl = await question(
        'Enter your TURN server URL (e.g., turn:your-server.com:3478): '
      )
      const turnUsername = await question('Enter your TURN server username: ')
      const turnCredential = await question(
        'Enter your TURN server credential: '
      )

      if (!validateUrl(turnUrl)) {
        console.log(colorize('Invalid TURN server URL format', 'red'))
        return null
      }

      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential,
          },
        ],
      }

    case '2':
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      }

    case '3':
      return null // Will proceed to custom configuration

    default:
      console.log(
        colorize('Invalid choice, using custom configuration...', 'yellow')
      )
      return null
  }
}

async function generateConfig() {
  console.log(colorize('🚀 RTC Configuration Generator', 'bold'))
  console.log(colorize('=====================================', 'blue'))
  console.log(
    'This tool helps you create the RTC_CONFIG environment variable for Chitchatter.'
  )
  console.log('The configuration will include both STUN and TURN servers.\n')

  // Ask if user wants to use preset or custom config
  const preset = await usePresetConfig()

  let rtcConfig

  if (preset) {
    rtcConfig = preset
    console.log(colorize('\n✅ Using preset configuration', 'green'))
  } else {
    // Custom configuration
    console.log(colorize('\n⚙️  Custom Configuration', 'blue'))
    console.log('You can add both STUN and TURN servers to your configuration.')
    console.log(
      'STUN servers help with NAT traversal, TURN servers relay traffic when direct connection fails.\n'
    )

    const stunServers = await getServerInput('stun')
    const turnServers = await getServerInput('turn')

    const allServers = [...stunServers, ...turnServers]

    if (allServers.length === 0) {
      console.log(colorize('❌ No servers configured. Exiting.', 'red'))
      rl.close()
      return
    }

    rtcConfig = { iceServers: allServers }
  }

  // Display configuration
  console.log(colorize('\n📋 Generated RTC Configuration:', 'blue'))
  console.log(JSON.stringify(rtcConfig, null, 2))

  // Generate base64 encoded string
  const configJson = JSON.stringify(rtcConfig)
  const base64Config = Buffer.from(configJson).toString('base64')

  console.log(colorize('\n🔐 Base64 Encoded Configuration:', 'green'))
  console.log(base64Config)

  // Usage instructions
  console.log(colorize('\n📖 Usage Instructions:', 'blue'))
  console.log(colorize('===================', 'blue'))
  console.log('\n1. Copy the base64 string above')
  console.log('\n2. Set it as the RTC_CONFIG environment variable:')
  console.log(colorize('   For local development (.env file):', 'yellow'))
  console.log(`   RTC_CONFIG="${base64Config}"`)
  console.log(colorize('\n   For Vercel deployment:', 'yellow'))
  console.log('   - Go to your Vercel dashboard')
  console.log('   - Navigate to your project settings')
  console.log('   - Go to Environment Variables')
  console.log(`   - Add: RTC_CONFIG = ${base64Config}`)
  console.log(colorize('\n   For other deployment platforms:', 'yellow'))
  console.log(
    "   - Set the environment variable according to your platform's documentation"
  )

  console.log(
    colorize(
      '\n3. The API will extract TURN servers from this configuration automatically.',
      'green'
    )
  )

  console.log(colorize('\n🔍 Verification:', 'blue'))
  console.log('You can verify the configuration by decoding the base64 string:')
  console.log(colorize(`echo "${base64Config}" | base64 -d | jq .`, 'yellow'))

  rl.close()
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(colorize('🚀 RTC Configuration Generator', 'bold'))
  console.log('=====================================')
  console.log('Usage: node generate-rtc-config.cjs [options]')
  console.log('\nOptions:')
  console.log('  --help, -h     Show this help message')
  console.log('  --example      Show example configurations')
  console.log(
    '\nThis tool generates base64-encoded RTC_CONFIG environment variables'
  )
  console.log('for use with the Chitchatter API endpoint.')
  process.exit(0)
}

if (args.includes('--example')) {
  console.log(colorize('📋 Example Configurations:', 'blue'))
  console.log('==========================\n')

  console.log(colorize('1. STUN only configuration:', 'yellow'))
  const stunOnly = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  }
  console.log(JSON.stringify(stunOnly, null, 2))
  console.log(
    colorize('Base64:', 'green'),
    Buffer.from(JSON.stringify(stunOnly)).toString('base64')
  )

  console.log(colorize('\n2. STUN + TURN configuration:', 'yellow'))
  const stunTurn = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'your-username',
        credential: 'your-password',
      },
    ],
  }
  console.log(JSON.stringify(stunTurn, null, 2))
  console.log(
    colorize('Base64:', 'green'),
    Buffer.from(JSON.stringify(stunTurn)).toString('base64')
  )

  process.exit(0)
}

// Main execution
generateConfig().catch(error => {
  console.error(colorize('❌ Error:', 'red'), error.message)
  rl.close()
  process.exit(1)
})
