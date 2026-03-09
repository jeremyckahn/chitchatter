import { useContext, useEffect, useState } from 'react'

import { signalingServerUrl } from 'config/signalingServer'
import { SettingsContext } from 'contexts/SettingsContext'
import { useTurnConfig } from 'hooks/useTurnConfig'
import {
  ConnectionTest,
  ConnectionTestEvent,
  ConnectionTestEvents,
  SignalingConnection,
} from 'lib/ConnectionTest'
import { sleep } from 'lib/sleep'

export interface ConnectionTestResults {
  hasHost: boolean
  hasTURNServer: boolean
  signalingConnection: SignalingConnection
}

const rtcPollInterval = 20 * 1000
const signalingPollInterval = 30 * 1000

export const useConnectionTest = () => {
  const settingsContext = useContext(SettingsContext)
  const { isEnhancedConnectivityEnabled } = settingsContext.getUserSettings()

  const { turnConfig, isLoading: isConfigLoading } = useTurnConfig(
    isEnhancedConnectivityEnabled
  )

  const [hasHost, setHasHost] = useState(false)
  const [hasTURNServer, setHasTURNServer] = useState(false)
  const [signalingConnection, setSignalingConnection] = useState(
    SignalingConnection.SEARCHING
  )

  useEffect(() => {
    if (isConfigLoading) {
      return
    }

    const checkRtcConnection = async () => {
      const connectionTest = new ConnectionTest(turnConfig, signalingServerUrl)

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
        setHasTURNServer(false)
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
          const connectionTest = new ConnectionTest(
            turnConfig,
            signalingServerUrl
          )
          const result = await connectionTest.testSignalingConnection()
          setSignalingConnection(result)
        } catch (_e) {
          setSignalingConnection(SignalingConnection.FAILED)
        }

        await sleep(signalingPollInterval)
      }
    })()
  }, [turnConfig, isConfigLoading])

  return {
    connectionTestResults: { hasHost, hasTURNServer, signalingConnection },
  }
}
