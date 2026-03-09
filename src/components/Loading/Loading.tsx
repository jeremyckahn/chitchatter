import Box, { BoxProps } from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslation } from 'react-i18next'

interface WholePageLoadingProps extends BoxProps {}

export const WholePageLoading = ({
  sx = [],
  ...props
}: WholePageLoadingProps) => {
  const { t } = useTranslation()
  return (
    <Box
      sx={[
        {
          display: 'flex',
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
      <CircularProgress aria-label={t('common.loading')} />
    </Box>
  )
}
