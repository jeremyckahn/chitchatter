import { Typography } from '@mui/material'

import { ConnectionTestResults } from './useConnectionTest'

interface ConnectionTestResultsDisplayProps {
  connectionTestResults: ConnectionTestResults
}
export const ConnectionTestResultsDisplay = ({
  connectionTestResults: { hasHost, hasRelay },
}: ConnectionTestResultsDisplayProps) => {
  if (hasHost && hasRelay) {
    return (
      <Typography
        variant="subtitle2"
        sx={theme => ({ color: theme.palette.success.main })}
      >
        Connection is good
      </Typography>
    )
  } else if (hasHost) {
    return (
      <Typography
        variant="subtitle2"
        sx={theme => ({ color: theme.palette.warning.main })}
      >
        Connection is decent, but peers may be unreachable
      </Typography>
    )
  } else {
    return (
      <Typography
        variant="subtitle2"
        sx={theme => ({ color: theme.palette.error.main })}
      >
        No connection
      </Typography>
    )
  }
}
