import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import localforage from 'localforage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  Route,
  BrowserRouter,
  HashRouter,
  Routes,
} from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { WholePageLoading } from 'components/Loading/Loading'
import { Shell } from 'components/Shell'
import { isEnhancedConnectivityAvailable } from 'config/enhancedConnectivity'
import { homepageUrl, routes } from 'config/routes'
import { SettingsContext } from 'contexts/SettingsContext'
import { StorageContext } from 'contexts/StorageContext'
import {
  isConfigMessageEvent,
  PostMessageEvent,
  PostMessageEventName,
} from 'models/sdk'
import { RouterType } from 'models/router'
import { UserSettings } from 'core/models/settings'
import { QueryParamKeys } from 'models/shell'
import { About } from 'pages/About'
import { Disclaimer } from 'pages/Disclaimer'
import { Home } from 'pages/Home'
import { PrivateRoom } from 'pages/PrivateRoom'
import { PublicRoom } from 'pages/PublicRoom'
import { Settings } from 'pages/Settings'
import { serialization } from 'core/settings/serialization'
import { SettingsManager } from 'core/settings/SettingsManager'
import { createWebStorage } from 'adapters/web'
import { routerType } from 'config/router'

export interface BootstrapProps {
  persistedStorage?: typeof localforage
  initialUserSettings: UserSettings
  serializationService?: typeof serialization
}

const configListenerTimeout = 3000

// Create QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  },
})

const getConfigFromSdk = () => {
  const queryParams = new URLSearchParams(window.location.search)

  const { origin: parentFrameOrigin } = new URL(
    decodeURIComponent(queryParams.get(QueryParamKeys.PARENT_DOMAIN) ?? '')
  )

  return new Promise<Partial<UserSettings>>((resolve, reject) => {
    let expireTimout: NodeJS.Timeout

    const expireListener = () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(expireTimout)
      reject()
    }

    expireTimout = setTimeout(expireListener, configListenerTimeout)

    const handleMessage = (event: MessageEvent) => {
      if (!isConfigMessageEvent(event)) return

      resolve(event.data.payload)
      expireListener()
    }

    window.addEventListener('message', handleMessage)

    const postMessageEvent: PostMessageEvent['data'] = {
      name: PostMessageEventName.CONFIG_REQUESTED,
      payload: {},
    }

    window.parent.postMessage(postMessageEvent, parentFrameOrigin)
  })
}

const Bootstrap = ({
  persistedStorage: persistedStorageProp = localforage.createInstance({
    name: 'chitchatter',
    description: 'Persisted settings data for chitchatter',
  }),
  initialUserSettings,
  serializationService = serialization,
}: BootstrapProps) => {
  const Router = routerType === RouterType.HASH ? HashRouter : BrowserRouter
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  )

  const [persistedStorage] = useState(persistedStorageProp)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [userSettings, setUserSettings] =
    useState<UserSettings>(initialUserSettings)
  const { userId } = userSettings

  const isEmbedded = queryParams.has(QueryParamKeys.IS_EMBEDDED)

  const settingsManager = useMemo(() => {
    const storage = createWebStorage(persistedStorageProp)

    return new SettingsManager({
      // An embedded instance is a guest in someone else's page, so it reads
      // persisted settings — it still needs its own identity and keypair to
      // survive a reload — but never writes them, since the host's
      // configuration is not the user's own. Expressing that as a storage
      // adapter whose writes go nowhere keeps the condition out of every save
      // path.
      storage: isEmbedded
        ? {
            ...storage,
            setItem: <T,>(_key: string, value: T) => Promise.resolve(value),
            removeItem: () => Promise.resolve(),
          }
        : storage,
      serializationService,
    })
  }, [isEmbedded, persistedStorageProp, serializationService])

  const persistUserSettings = useCallback(
    (newUserSettings: UserSettings) => settingsManager.save(newUserSettings),
    [settingsManager]
  )

  const {
    needRefresh: [appNeedsUpdate],
  } = useRegisterSW()

  useEffect(() => {
    ;(async () => {
      if (hasLoadedSettings) return

      // Layering persisted settings over the defaults is what migrates data
      // saved by an older version: a setting added since then takes its default
      // rather than arriving undefined.
      const persistedUserSettings =
        await settingsManager.load(initialUserSettings)

      const computeUserSettings = async (): Promise<UserSettings> => {
        let finalSettings = {
          ...userSettings,
          ...persistedUserSettings,
        }

        if (queryParams.has(QueryParamKeys.GET_SDK_CONFIG)) {
          try {
            const configFromSdk = await getConfigFromSdk()

            finalSettings = {
              ...finalSettings,
              ...configFromSdk,
            }
          } catch (_e) {
            console.error(
              'Chitchatter configuration from parent frame could not be loaded'
            )
          }
        }
        return finalSettings
      }

      const computedUserSettings = await computeUserSettings()

      setUserSettings(computedUserSettings)
      setHasLoadedSettings(true)

      await persistUserSettings(computedUserSettings)
    })()
  }, [
    hasLoadedSettings,
    userSettings,
    userId,
    queryParams,
    persistUserSettings,
    settingsManager,
    initialUserSettings,
  ])

  useEffect(() => {
    const freshQueryParams = new URLSearchParams(window.location.search)

    if (!freshQueryParams.has(QueryParamKeys.IS_EMBEDDED)) return

    const handleConfigMessage = (event: MessageEvent) => {
      if (!hasLoadedSettings) return
      if (!isConfigMessageEvent(event)) return

      const overrideConfig: Partial<UserSettings> = event.data.payload

      setUserSettings({
        ...userSettings,
        ...overrideConfig,
      })
    }

    window.addEventListener('message', handleConfigMessage)

    return () => {
      window.removeEventListener('message', handleConfigMessage)
    }
  }, [hasLoadedSettings, userSettings])

  const settingsContextValue = {
    updateUserSettings: async (changedSettings: Partial<UserSettings>) => {
      const newSettings = {
        ...userSettings,
        ...changedSettings,
      }

      await persistUserSettings(newSettings)

      setUserSettings(newSettings)
    },
    getUserSettings: () => {
      return {
        ...userSettings,
        // If enhanced connectivity is not available, always return false
        isEnhancedConnectivityEnabled: isEnhancedConnectivityAvailable
          ? userSettings.isEnhancedConnectivityEnabled
          : false,
      }
    },
  }

  const storageContextValue = {
    getPersistedStorage: () => persistedStorage,
  }

  const routerProps =
    Router === BrowserRouter ? { basename: homepageUrl.pathname } : {}

  return (
    <QueryClientProvider client={queryClient}>
      <Router {...routerProps}>
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
              <WholePageLoading />
            )}
          </SettingsContext.Provider>
        </StorageContext.Provider>
      </Router>
    </QueryClientProvider>
  )
}

export default Bootstrap
