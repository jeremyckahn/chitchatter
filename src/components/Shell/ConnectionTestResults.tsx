import Circle from '@mui/icons-material/FiberManualRecord'
import ReportIcon from '@mui/icons-material/Report'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Box } from '@mui/system'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { SignalingConnection } from 'lib/ConnectionTest'

import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

interface ConnectionTestResultsProps {
  connectionTestResults: IConnectionTestResults
}
export const ConnectionTestResults = ({
  connectionTestResults: { hasHost, hasTURNServer, signalingConnection },
}: ConnectionTestResultsProps) => {
  const { t } = useTranslation()
  const { setIsServerConnectionFailureDialogOpen } = useContext(ShellContext)
  const { getUserSettings } = useContext(SettingsContext)
  const { isEnhancedConnectivityEnabled } = getUserSettings()

  const handleServerConnectionFailedMessageClick = () => {
    setIsServerConnectionFailureDialogOpen(true)
  }

  if (signalingConnection === SignalingConnection.FAILED) {
    return (
      <Typography
        variant="subtitle2"
        sx={{ cursor: 'pointer' }}
        onClick={handleServerConnectionFailedMessageClick}
      >
        <Box
          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <ReportIcon color="error" sx={{ mr: 1 }} />
          <span>{t('connection.serverFailed')}</span>
        </Box>
      </Typography>
    )
  }

  if (signalingConnection !== SignalingConnection.CONNECTED) {
    return (
      <Typography variant="subtitle2">
        <Box
          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <CircularProgress size={16} sx={{ mr: 1.5 }} />
          <span>{t('connection.searchingServers')}</span>
        </Box>
      </Typography>
    )
  }

  // NOTE: hasTURNServer will be true when the user has disabled TURN server
  // connectivity but the STUN server is in use. This results in a misleading
  // false positive of full network connectivity, so
  // isEnhancedConnectivityEnabled is used as an additional condition.
  const hasFullConnectivity =
    hasHost && hasTURNServer && isEnhancedConnectivityEnabled

  if (hasFullConnectivity) {
    return (
      <Tooltip title={t('connection.fullConnectionTip')}>
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.success.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          {t('connection.fullConnection')}
        </Typography>
      </Tooltip>
    )
  } else if (hasHost) {
    return (
      <Tooltip title={t('connection.partialConnectionTip')}>
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.warning.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          {t('connection.partialConnection')}
        </Typography>
      </Tooltip>
    )
  } else {
    return (
      <Tooltip title={t('connection.noConnectionTip')}>
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.error.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          {t('connection.noConnection')}
        </Typography>
      </Tooltip>
    )
  }
}
