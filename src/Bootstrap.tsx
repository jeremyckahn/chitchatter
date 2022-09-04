import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'

import { Home } from 'pages/Home/'
import { PublicRoom } from 'pages/PublicRoom/'
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
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [settings, setSettings] = useState({ userId: getUuid() })
  const { userId } = settings

  useEffect(() => {
    ;(async () => {
      if (hasLoadedSettings) return

      const persistedUserSettings =
        await persistedStorage.getItem<UserSettings>(
          PersistedStorageKeys.USER_SETTINGS
        )

      if (persistedUserSettings) {
        setSettings(persistedUserSettings)
      } else {
        await persistedStorage.setItem(
          PersistedStorageKeys.USER_SETTINGS,
          settings
        )
      }

      setHasLoadedSettings(true)
    })()
  }, [hasLoadedSettings, persistedStorage, settings, userId])

  return (
    <Router>
      <Shell userPeerId={userId}>
        {hasLoadedSettings ? (
          <Routes>
            {['/', '/index.html'].map(path => (
              <Route key={path} path={path} element={<Home />} />
            ))}
            <Route
              path="/public/:roomId"
              element={<PublicRoom userId={userId} />}
            />
          </Routes>
        ) : (
          <></>
        )}
      </Shell>
    </Router>
  )
}

export default Bootstrap
