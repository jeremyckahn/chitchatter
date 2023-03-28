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

      try {
        await connectionTest.runRtcPeerConnectionTest()
      } catch (e) {
        setHasHost(false)
        setHasRelay(false)
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
    connectionTestResults: { hasHost, hasRelay },
  }
}
