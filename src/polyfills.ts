import { Buffer } from 'buffer'

// @ts-ignore
import process from 'process/browser'

// Polyfill
window.Buffer = Buffer
window.process = process
