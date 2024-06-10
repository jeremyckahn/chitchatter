import { SettingsContext } from 'contexts/SettingsContext'
import { useContext, useMemo } from 'react'
import { createTheme } from '@mui/material/styles'

export const useShellTheme = () => {
  const { getUserSettings } = useContext(SettingsContext)
  const { colorMode } = getUserSettings()

  const theme = useMemo(
    () =>
      // NOTE: You can make theme customizations here. It is recommended to use
      // the default theme viewer as a reference:
      // https://mui.com/material-ui/customization/default-theme/
      createTheme({
        palette: {
          mode: colorMode,
        },
      }),
    [colorMode]
  )

  return theme
}
