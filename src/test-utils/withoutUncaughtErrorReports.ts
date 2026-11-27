/**
 * Runs `run` with jsdom's report of uncaught errors switched off.
 *
 * React rethrows an error from render through a dispatched `error` event, and
 * jsdom prints every such event with its full stack. For a test that expects
 * the render to throw, that is noise that reads like a failure. Cancelling the
 * event silences the report only; the error still reaches the caller.
 */
export const withoutUncaughtErrorReports = <T>(run: () => T): T => {
  const cancelReport = (event: ErrorEvent) => event.preventDefault()

  window.addEventListener('error', cancelReport)

  try {
    return run()
  } finally {
    window.removeEventListener('error', cancelReport)
  }
}
