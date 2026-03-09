import { useContext, useEffect } from 'react'
import Box from '@mui/material/Box'
import MuiMarkdown from 'mui-markdown'
import useTheme from '@mui/material/styles/useTheme'
import { useTranslation } from 'react-i18next'

import { ShellContext } from 'contexts/ShellContext'

export const Disclaimer = () => {
  const { setTitle } = useContext(ShellContext)
  const theme = useTheme()
  const { t } = useTranslation()

  useEffect(() => {
    setTitle(t('disclaimer.title'))
  }, [setTitle, t])

  return (
    <Box
      className="Disclaimer"
      sx={{
        p: 2,
        mx: 'auto',
        maxWidth: theme.breakpoints.values.md,
        '& p': {
          mb: 2,
        },
      }}
    >
      <MuiMarkdown>{t('disclaimer.content')}</MuiMarkdown>
    </Box>
  )
}
