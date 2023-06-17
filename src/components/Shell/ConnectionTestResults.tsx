import { Tooltip, Typography } from '@mui/material'
import Circle from '@mui/icons-material/FiberManualRecord'

import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

interface ConnectionTestResultsProps {
  connectionTestResults: IConnectionTestResults
}
export const ConnectionTestResults = ({
  connectionTestResults: { hasHost, hasRelay },
}: ConnectionTestResultsProps) => {
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
