import { useContext, useEffect, PropsWithChildren } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { ShellContext } from 'contexts/ShellContext'

const H2 = ({ children }: PropsWithChildren) => (
  <Typography
    variant="h2"
    sx={theme => ({
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      mb: 2,
    })}
  >
    {children}
  </Typography>
)

const H3 = ({ children }: PropsWithChildren) => (
  <Typography
    variant="h2"
    sx={theme => ({
      fontSize: theme.typography.h5.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      mb: 1.5,
    })}
  >
    {children}
  </Typography>
)

const P = ({ children }: PropsWithChildren) => (
  <Typography sx={{ mb: 1 }}>{children}</Typography>
)

export const Disclaimer = () => {
  const { setTitle } = useContext(ShellContext)

  useEffect(() => {
    setTitle('Disclaimer')
  }, [setTitle])

  return (
    <Box className="max-w-3xl mx-auto p-4">
      <H2>Interpretation and Definitions</H2>
      <H3>Interpretation</H3>
      <P>
        The words of which the initial letter is capitalized have meanings
        defined under the following conditions. The following definitions shall
        have the same meaning regardless of whether they appear in singular or
        in plural.
      </P>
    </Box>
  )
}
