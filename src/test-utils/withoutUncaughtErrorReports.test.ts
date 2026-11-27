import { describe, expect, test } from 'vitest'

import { withoutUncaughtErrorReports } from './withoutUncaughtErrorReports'

const dispatchUncaughtError = () =>
  window.dispatchEvent(
    new ErrorEvent('error', { cancelable: true, error: new Error('boom') })
  )

describe('withoutUncaughtErrorReports', () => {
  test('returns what the callback returns', () => {
    expect(withoutUncaughtErrorReports(() => 42)).toBe(42)
  })

  test('still throws what the callback throws', () => {
    expect(() =>
      withoutUncaughtErrorReports(() => {
        throw new Error('boom')
      })
    ).toThrow('boom')
  })

  test('cancels error events while the callback runs', () => {
    const wasReported = withoutUncaughtErrorReports(dispatchUncaughtError)

    expect(wasReported).toBe(false)
  })

  test('stops cancelling them once the callback has run, even if it threw', () => {
    expect(() =>
      withoutUncaughtErrorReports(() => {
        throw new Error('boom')
      })
    ).toThrow()

    let wasCancelledBeforeThisListener: boolean | null = null

    // Registered after the helper's own listener would have been, so it sees
    // whether that one is still cancelling. It then cancels the event itself,
    // only to keep jsdom from printing it.
    const listener = (event: ErrorEvent) => {
      wasCancelledBeforeThisListener = event.defaultPrevented
      event.preventDefault()
    }

    window.addEventListener('error', listener)

    try {
      dispatchUncaughtError()
    } finally {
      window.removeEventListener('error', listener)
    }

    expect(wasCancelledBeforeThisListener).toBe(false)
  })
})
