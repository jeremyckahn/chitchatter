import { useEffect, useState } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'

import * as serviceWorkerRegistration from 'serviceWorkerRegistration'
import { StorageContext } from 'contexts/StorageContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { routes } from 'config/routes'
import { Home } from 'pages/Home'
import { About } from 'pages/About'
import { Disclaimer } from 'pages/Disclaimer'
import { Settings } from 'pages/Settings'
import { PublicRoom } from 'pages/PublicRoom'
import { PrivateRoom } from 'pages/PrivateRoom'
import { UserSettings } from 'models/settings'
import { PersistedStorageKeys } from 'models/storage'
import { QueryParamKeys } from 'models/shell'
import { Shell } from 'components/Shell'

export interface BootstrapProps {
  persistedStorage?: typeof localforage
  getUuid?: typeof uuid
}

const homepageUrl = new URL(
  process.env.REACT_APP_HOMEPAGE ?? 'https://chitchatter.im/'
)

const waitForConfig = () => {
  return new Promise<UserSettings>((resolve, reject) => {
    const configWaitTimeout = 3000

    setTimeout(reject, configWaitTimeout)

    window.addEventListener('message', (event: MessageEvent) => {
      // FIXME: Make this work
      //if (event.origin !== window.location.origin) return

      if (event.data?.name === 'config') {
        console.log('got config')
        // FIXME: Use a specific origin here
        window.postMessage({ name: 'receivedConfig' }, '*')
        resolve(event.data.payload)
      }
    })
  })
}

function Bootstrap({
  persistedStorage: persistedStorageProp = localforage.createInstance({
    name: 'chitchatter',
    description: 'Persisted settings data for chitchatter',
  }),
  getUuid = uuid,
}: BootstrapProps) {
  const [persistedStorage] = useState(persistedStorageProp)
  const [appNeedsUpdate, setAppNeedsUpdate] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userId: getUuid(),
    customUsername: '',
    colorMode: 'dark',
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
    showActiveTypingStatus: true,
  })
  const { userId } = userSettings

  const handleServiceWorkerUpdate = () => {
    setAppNeedsUpdate(true)
  }

  useEffect(() => {
    serviceWorkerRegistration.register({ onUpdate: handleServiceWorkerUpdate })
  }, [])

  useEffect(() => {
    ;(async () => {
      if (hasLoadedSettings) return

      const persistedUserSettings =
        await persistedStorageProp.getItem<UserSettings>(
          PersistedStorageKeys.USER_SETTINGS
        )

      if (persistedUserSettings) {
        const queryParams = new URLSearchParams(window.location.search)

        let overrideConfig = {}

        try {
          if (queryParams.has(QueryParamKeys.WAIT_FOR_CONFIG)) {
            overrideConfig = await waitForConfig()
          }
        } catch (e) {
          console.error(
            'Chitchatter configuration from parent frame could not be loaded'
          )
        }

        setUserSettings({
          ...userSettings,
          ...persistedUserSettings,
          ...overrideConfig,
        })
      } else {
        await persistedStorageProp.setItem(
          PersistedStorageKeys.USER_SETTINGS,
          userSettings
        )
      }

      setHasLoadedSettings(true)
    })()
  }, [hasLoadedSettings, persistedStorageProp, userSettings, userId])

  const settingsContextValue = {
    updateUserSettings: async (changedSettings: Partial<UserSettings>) => {
      const newSettings = {
        ...userSettings,
        ...changedSettings,
      }

      await persistedStorageProp.setItem(
        PersistedStorageKeys.USER_SETTINGS,
        newSettings
      )

      setUserSettings(newSettings)
    },
    getUserSettings: () => ({ ...userSettings }),
  }

  const storageContextValue = {
    getPersistedStorage: () => persistedStorage,
  }

  return (
    <Router basename={homepageUrl.pathname}>
      <StorageContext.Provider value={storageContextValue}>
        <SettingsContext.Provider value={settingsContextValue}>
          {hasLoadedSettings ? (
            <Shell appNeedsUpdate={appNeedsUpdate} userPeerId={userId}>
              <Routes>
                {[routes.ROOT, routes.INDEX_HTML].map(path => (
                  <Route
                    key={path}
                    path={path}
                    element={<Home userId={userId} />}
                  />
                ))}
                <Route path={routes.ABOUT} element={<About />} />
                <Route path={routes.DISCLAIMER} element={<Disclaimer />} />
                <Route
                  path={routes.SETTINGS}
                  element={<Settings userId={userId} />}
                />
                <Route
                  path={routes.PUBLIC_ROOM}
                  element={<PublicRoom userId={userId} />}
                />
                <Route
                  path={routes.PRIVATE_ROOM}
                  element={<PrivateRoom userId={userId} />}
                />
                <Route
                  path="*"
                  element={<Navigate to={routes.ROOT} replace />}
                />
              </Routes>
            </Shell>
          ) : (
            <></>
          )}
        </SettingsContext.Provider>
      </StorageContext.Provider>
    </Router>
  )
}

export default Bootstrap
