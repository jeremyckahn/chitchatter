import Box, { BoxProps } from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

interface WholePageLoadingProps extends BoxProps {
  /** Text shown beneath the spinner, describing what is being waited on. */
  label?: string
}

export const WholePageLoading = ({
  sx = [],
  label,
  ...props
}: WholePageLoadingProps) => {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      <CircularProgress aria-label={label ?? 'Loading'} />
      {label && <Typography color="text.secondary">{label}</Typography>}
    </Box>
  )
}
