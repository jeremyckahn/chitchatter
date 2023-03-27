import { useEffect, useState } from 'react'
import { sleep } from 'utils'
import {
  ConnectionTest,
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
    const checkConnection = async () => {
      const newConnectionTest = new ConnectionTest()

      newConnectionTest.addEventListener(
        ConnectionTestEvents.CONNECTION_TEST_RESULTS_UPDATED,
        () => {
          const { hasHost, hasRelay } = newConnectionTest

          setConnectionTestResults({ hasHost, hasRelay })
        }
      )

      try {
        await newConnectionTest.runRtcPeerConnectionTest()
      } catch (e) {
        setConnectionTestResults({ hasHost: false, hasRelay: false })
        console.error(e)
      }
    }

    ;(async () => {
      while (true) {
        await checkConnection()
        await sleep(20 * 1000)
      }
    })()
  }, [])

  return {
    connectionTestResults,
  }
}
