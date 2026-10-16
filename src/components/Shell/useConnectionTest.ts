import { useContext, useEffect, useState } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { useTurnConfig } from 'hooks/useTurnConfig'
import {
  ConnectionTest,
  ConnectionTestEvent,
  ConnectionTestEvents,
  TrackerConnection,
} from 'lib/ConnectionTest'
import { sleep } from 'core/lib/sleep'

export interface ConnectionTestResults {
  hasHost: boolean
  hasTURNServer: boolean
  trackerConnection: TrackerConnection
}

const rtcPollInterval = 20 * 1000
const trackerPollInterval = 5 * 1000

export const useConnectionTest = () => {
  const settingsContext = useContext(SettingsContext)
  const { isEnhancedConnectivityEnabled } = settingsContext.getUserSettings()

  const { turnConfig, isLoading: isConfigLoading } = useTurnConfig(
    isEnhancedConnectivityEnabled
  )

  const [hasHost, setHasHost] = useState(false)
  const [hasTURNServer, setHasTURNServer] = useState(false)
  const [trackerConnection, setTrackerConnection] = useState(
    TrackerConnection.SEARCHING
  )

  useEffect(() => {
    // Don't start connection tests until rtcConfig is loaded
    if (isConfigLoading) {
      return
    }

    let isCancelled = false
    let activeRtcTest: ConnectionTest | null = null
    const timeoutIds = new Set<ReturnType<typeof setTimeout>>()

    const checkRtcConnection = async () => {
      const connectionTest = new ConnectionTest(turnConfig)

      activeRtcTest = connectionTest

      const handleHasHostChanged = ((event: ConnectionTestEvent) => {
        if (isCancelled) return

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
        if (isCancelled) return

        setHasTURNServer(event.detail.hasTURNServer)

        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_RELAY_CHANGED,
          handleHasRelayChanged
        )
      }) as EventListener

      connectionTest.addEventListener(
        ConnectionTestEvents.HAS_RELAY_CHANGED,
        handleHasRelayChanged
      )

      const listenerTimeoutId = setTimeout(() => {
        timeoutIds.delete(listenerTimeoutId)
        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_HOST_CHANGED,
          handleHasHostChanged
        )
        connectionTest.removeEventListener(
          ConnectionTestEvents.HAS_RELAY_CHANGED,
          handleHasRelayChanged
        )
      }, rtcPollInterval)

      timeoutIds.add(listenerTimeoutId)

      try {
        await connectionTest.initRtcPeerConnectionTest()
      } catch (e) {
        if (!isCancelled) {
          setHasHost(false)
          setHasTURNServer(false)
        }

        console.error(e)
      }

      return connectionTest
    }

    ;(async () => {
      while (!isCancelled) {
        const connectionTest = await checkRtcConnection()

        await sleep(rtcPollInterval)
        connectionTest.destroyRtcPeerConnectionTest()

        if (activeRtcTest === connectionTest) activeRtcTest = null
      }
    })()
    ;(async () => {
      while (!isCancelled) {
        try {
          const connectionTest = new ConnectionTest(turnConfig)
          const trackerConnectionTestResult =
            connectionTest.testTrackerConnection()

          if (!isCancelled) setTrackerConnection(trackerConnectionTestResult)
        } catch (_e) {
          if (!isCancelled) setTrackerConnection(TrackerConnection.FAILED)
        }

        await sleep(trackerPollInterval)
      }
    })()

    return () => {
      isCancelled = true
      timeoutIds.forEach(clearTimeout)
      activeRtcTest?.destroyRtcPeerConnectionTest()
      activeRtcTest = null
    }
  }, [turnConfig, isConfigLoading])

  return {
    connectionTestResults: { hasHost, hasTURNServer, trackerConnection },
  }
}
