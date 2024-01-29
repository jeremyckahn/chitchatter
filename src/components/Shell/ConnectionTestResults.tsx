import { useContext } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Circle from '@mui/icons-material/FiberManualRecord'
import { Box } from '@mui/system'
import ReportIcon from '@mui/icons-material/Report'

import { TrackerConnection } from 'lib/ConnectionTest'
import { ShellContext } from 'contexts/ShellContext'

import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

interface ConnectionTestResultsProps {
  connectionTestResults: IConnectionTestResults
}
export const ConnectionTestResults = ({
  connectionTestResults: { hasHost, hasRelay, trackerConnection },
}: ConnectionTestResultsProps) => {
  const { setIsServerConnectionFailureDialogOpen } = useContext(ShellContext)

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

  if (hasHost && hasRelay) {
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
