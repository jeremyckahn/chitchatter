import { useContext, useEffect } from 'react'
import MuiMarkdown from 'mui-markdown'
import Box from '@mui/material/Box'
import useTheme from '@mui/material/styles/useTheme'
import { useTranslation } from 'react-i18next'

import { ShellContext } from 'contexts/ShellContext'

export const About = () => {
  const { setTitle } = useContext(ShellContext)
  const theme = useTheme()
  const { t } = useTranslation()

  useEffect(() => {
    setTitle(t('about.title'))
  }, [setTitle, t])

  return (
    <Box
      className="About"
      sx={{
        p: 2,
        mx: 'auto',
        maxWidth: theme.breakpoints.values.md,
        '& p': {
          mb: 2,
        },
      }}
    >
      <MuiMarkdown>{t('about.content')}</MuiMarkdown>
    </Box>
  )
}
