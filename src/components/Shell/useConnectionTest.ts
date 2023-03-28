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

      connectionTest.addEventListener(ConnectionTestEvents.HAS_HOST_CHANGED, ((
        event: ConnectionTestEvent
      ) => {
        setHasHost(event.detail.hasHost)
      }) as EventListener)

      connectionTest.addEventListener(ConnectionTestEvents.HAS_RELAY_CHANGED, ((
        event: ConnectionTestEvent
      ) => {
        setHasRelay(event.detail.hasRelay)
      }) as EventListener)

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
