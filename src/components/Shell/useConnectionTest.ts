import { useEffect, useState } from 'react'

import { sleep } from 'lib/sleep'
import {
  ConnectionTest,
  ConnectionTestEvent,
  ConnectionTestEvents,
  TrackerConnection,
} from 'lib/ConnectionTest'

export interface ConnectionTestResults {
  hasHost: boolean
  hasRelay: boolean
  trackerConnection: TrackerConnection
}

const rtcPollInterval = 20 * 1000
const trackerPollInterval = 5 * 1000

export const useConnectionTest = () => {
  const [hasHost, setHasHost] = useState(false)
  const [hasRelay, setHasRelay] = useState(false)
  const [trackerConnection, setTrackerConnection] = useState(
    TrackerConnection.SEARCHING
  )

  useEffect(() => {
    const checkRtcConnection = async () => {
      const connectionTest = new ConnectionTest()

      const handleHasHostChanged = ((event: ConnectionTestEvent) => {
        setHasHost(event.detail.hasHost)

        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_HOST_CHANGED,
          handleHasHostChanged
        )
      }) as EventListener

      connectionTest.addEventListener(
        ConnectionTestEvents.HAS_HOST_CHANGED,
        handleHasHostChanged
      )

      const handleHasRelayChanged = ((event: ConnectionTestEvent) => {
        setHasRelay(event.detail.hasRelay)

        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_RELAY_CHANGED,
          handleHasRelayChanged
        )
      }) as EventListener

      connectionTest.addEventListener(
        ConnectionTestEvents.HAS_RELAY_CHANGED,
        handleHasRelayChanged
      )

      setTimeout(() => {
        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_HOST_CHANGED,
          handleHasHostChanged
        )
        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_RELAY_CHANGED,
          handleHasRelayChanged
        )
      }, rtcPollInterval)

      try {
        await connectionTest.initRtcPeerConnectionTest()
      } catch (e) {
        setHasHost(false)
        setHasRelay(false)
        console.error(e)
      }

      return connectionTest
    }

    ;(async () => {
      while (true) {
        const connectionTest = await checkRtcConnection()
        await sleep(rtcPollInterval)
        connectionTest.destroyRtcPeerConnectionTest()
      }
    })()
    ;(async () => {
      while (true) {
        try {
          const connectionTest = new ConnectionTest()
          const trackerConnectionTestResult =
            connectionTest.testTrackerConnection()

          setTrackerConnection(trackerConnectionTestResult)
        } catch (e) {
          setTrackerConnection(TrackerConnection.FAILED)
        }

        await sleep(trackerPollInterval)
      }
    })()
  }, [])

  return {
    connectionTestResults: { hasHost, hasRelay, trackerConnection },
  }
}
