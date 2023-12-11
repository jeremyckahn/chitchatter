import Box, { BoxProps } from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

interface WholePageLoadingProps extends BoxProps {}

export const WholePageLoading = ({
  sx = [],
  ...props
}: WholePageLoadingProps) => {
  return (
    <Box
      sx={[
        {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      <CircularProgress />
    </Box>
  )
}
