import { useEffect, useState } from 'react'
import {
  connectionTest,
  ConnectionTestEvents,
} from 'services/ConnectionTest/ConnectionTest'

export interface ConnectionTestResults {
  hasHost: boolean
  hasRelay: boolean
}

export const useConnectionTest = () => {
  const [connectionTestResults, setConnectionTestResults] =
    useState<ConnectionTestResults>({ hasHost: false, hasRelay: false })

  useEffect(() => {
    ;(async () => {
      // FIXME: Update results periodically
      connectionTest.addEventListener(
        ConnectionTestEvents.CONNECTION_TEST_RESULTS_UPDATED,
        () => {
          const { hasHost, hasRelay } = connectionTest

          setConnectionTestResults({ hasHost, hasRelay })
        }
      )

      connectionTest.runRtcPeerConnectionTest()
    })()
  }, [])

  return {
    connectionTestResults,
  }
}
