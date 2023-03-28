import { useEffect, useState } from 'react'
import { sleep } from 'utils'
import {
  ConnectionTest,
  ConnectionTestEvent,
  ConnectionTestEvents,
} from 'services/ConnectionTest/ConnectionTest'

export interface ConnectionTestResults {
  hasHost: boolean
  hasRelay: boolean
}

const pollInterval = 20 * 1000

export const useConnectionTest = () => {
  const [hasHost, setHasHost] = useState(false)
  const [hasRelay, setHasRelay] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      const connectionTest = new ConnectionTest()

      const handleHasHostChanged = ((event: ConnectionTestEvent) => {
        if (event.detail.hasHost) {
          setHasHost(true)

          connectionTest.removeEventListener(
            ConnectionTestEvents.HAS_HOST_CHANGED,
            handleHasHostChanged
          )
        }
      }) as EventListener

      connectionTest.addEventListener(
        ConnectionTestEvents.HAS_HOST_CHANGED,
        handleHasHostChanged
      )

      const handleHasRelayChanged = ((event: ConnectionTestEvent) => {
        if (event.detail.hasRelay) {
          setHasRelay(true)

          connectionTest.removeEventListener(
            ConnectionTestEvents.HAS_RELAY_CHANGED,
            handleHasRelayChanged
          )
        }
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
      }, pollInterval)

      try {
        await connectionTest.runRtcPeerConnectionTest()
      } catch (e) {
        setHasHost(false)
        setHasRelay(false)
        console.error(e)
      }

      return connectionTest
    }

    ;(async () => {
      while (true) {
        const connectionTest = await checkConnection()
        await sleep(pollInterval)
        connectionTest.destroy()
      }
    })()
  }, [])

  return {
    connectionTestResults: { hasHost, hasRelay },
  }
}
