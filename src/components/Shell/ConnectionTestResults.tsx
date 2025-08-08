import Circle from '@mui/icons-material/FiberManualRecord'
import ReportIcon from '@mui/icons-material/Report'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Box } from '@mui/system'
import { useContext } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { TrackerConnection } from 'lib/ConnectionTest'

import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

interface ConnectionTestResultsProps {
  connectionTestResults: IConnectionTestResults
}
export const ConnectionTestResults = ({
  connectionTestResults: { hasHost, hasTURNServer, trackerConnection },
}: ConnectionTestResultsProps) => {
  const { setIsServerConnectionFailureDialogOpen } = useContext(ShellContext)
  const { getUserSettings } = useContext(SettingsContext)
  const { isEnhancedConnectivityEnabled } = getUserSettings()

  const handleServerConnectionFailedMessageClick = () => {
    setIsServerConnectionFailureDialogOpen(true)
  }

  if (trackerConnection === TrackerConnection.FAILED) {
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
          <span>Server connection failed</span>
        </Box>
      </Typography>
    )
  }

  if (trackerConnection !== TrackerConnection.CONNECTED) {
    return (
      <Typography variant="subtitle2">
        <Box
          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <CircularProgress size={16} sx={{ mr: 1.5 }} />
          <span>Searching for servers...</span>
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
      <Tooltip title="Connections can be established with all peers that also have a full network connection.">
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.success.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          Full network connection
        </Typography>
      </Tooltip>
    )
  } else if (hasHost) {
    return (
      <Tooltip title="Relay server is unavailable. Connections can only be established when a relay server is not needed for either peer.">
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.warning.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          Partial network connection
        </Typography>
      </Tooltip>
    )
  } else {
    return (
      <Tooltip title="Pairing server is unavailable. Peer connections cannot be established.">
        <Typography variant="subtitle2">
          <Typography
            component="span"
            sx={theme => ({ color: theme.palette.error.main })}
          >
            <Circle sx={{ fontSize: 'small' }} />
          </Typography>{' '}
          No network connection
        </Typography>
      </Tooltip>
    )
  }
}
