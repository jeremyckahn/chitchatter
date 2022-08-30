import { useEffect, useMemo, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import StepIcon from '@mui/material/StepIcon'
import Tooltip from '@mui/material/Tooltip'

import { ShellContext } from 'ShellContext'
import { Home } from 'pages/Home/'
import { PublicRoom } from 'pages/PublicRoom/'
import { UserSettings } from 'models/settings'
import { PersistedStorageKeys } from 'models/storage'

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
  const [title, setTitle] = useState('')
  const [numberOfPeers, setNumberOfPeers] = useState(1)

  const shellContextValue = useMemo(
    () => ({ numberOfPeers, setNumberOfPeers, setTitle }),
    [numberOfPeers, setNumberOfPeers, setTitle]
  )

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
    <ShellContext.Provider value={shellContextValue}>
      <Box
        className="Chitchatter"
        sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <AppBar position="relative">
          <Toolbar
            variant="regular"
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Typography sx={{ fontWeight: 'bold' }}>{title}</Typography>
            <Tooltip title="Number of peers in the room">
              <StepIcon icon={numberOfPeers} sx={{ marginLeft: 'auto' }} />
            </Tooltip>
          </Toolbar>
        </AppBar>
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
        ) : null}
      </Box>
    </ShellContext.Provider>
  )
}

export default Bootstrap
