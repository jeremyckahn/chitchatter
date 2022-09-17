import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'

import * as serviceWorkerRegistration from 'serviceWorkerRegistration'
import { SettingsContext } from 'contexts/SettingsContext'
import { Home } from 'pages/Home'
import { About } from 'pages/About'
import { PublicRoom } from 'pages/PublicRoom'
import { UserSettings } from 'models/settings'
import { PersistedStorageKeys } from 'models/storage'
import { Shell } from 'components/Shell'

export interface BootstrapProps {
  persistedStorage?: typeof localforage
  getUuid?: typeof uuid
}

function Bootstrap({
  persistedStorage = localforage.createInstance({
    name: 'chitchatter',
    description: 'Persisted settings data for chitchatter',
  }),
  getUuid = uuid,
}: BootstrapProps) {
  const [appNeedsUpdate, setAppNeedsUpdate] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userId: getUuid(),
    colorMode: 'dark',
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
        await persistedStorage.getItem<UserSettings>(
          PersistedStorageKeys.USER_SETTINGS
        )

      if (persistedUserSettings) {
        setUserSettings(persistedUserSettings)
      } else {
        await persistedStorage.setItem(
          PersistedStorageKeys.USER_SETTINGS,
          userSettings
        )
      }

      setHasLoadedSettings(true)
    })()
  }, [hasLoadedSettings, persistedStorage, userSettings, userId])

  const settingsContextValue = {
    updateUserSettings: async (changedSettings: Partial<UserSettings>) => {
      const newSettings = {
        ...userSettings,
        ...changedSettings,
      }

      await persistedStorage.setItem(
        PersistedStorageKeys.USER_SETTINGS,
        newSettings
      )

      setUserSettings(newSettings)
    },
    getUserSettings: () => ({ ...userSettings }),
  }

  return (
    <Router>
      <SettingsContext.Provider value={settingsContextValue}>
        <Shell appNeedsUpdate={appNeedsUpdate} userPeerId={userId}>
          {hasLoadedSettings ? (
            <Routes>
              {['/', '/index.html'].map(path => (
                <Route
                  key={path}
                  path={path}
                  element={<Home userId={userId} />}
                />
              ))}
              <Route path="/about" element={<About />} />
              <Route
                path="/public/:roomId"
                element={<PublicRoom userId={userId} />}
              />
            </Routes>
          ) : (
            <></>
          )}
        </Shell>
      </SettingsContext.Provider>
    </Router>
  )
}

export default Bootstrap
