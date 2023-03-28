import { Typography } from '@mui/material'
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
      <Typography variant="subtitle2">
        <Typography
          component="span"
          sx={theme => ({ color: theme.palette.success.main })}
        >
          <Circle sx={{ fontSize: 'small' }} />
        </Typography>{' '}
        Full network connection
      </Typography>
    )
  } else if (hasHost) {
    return (
      <Typography variant="subtitle2">
        <Typography
          component="span"
          sx={theme => ({ color: theme.palette.warning.main })}
        >
          <Circle sx={{ fontSize: 'small' }} />
        </Typography>{' '}
        Partial network connection
      </Typography>
    )
  } else {
    return (
      <Typography variant="subtitle2">
        <Typography
          component="span"
          sx={theme => ({ color: theme.palette.error.main })}
        >
          <Circle sx={{ fontSize: 'small' }} />
        </Typography>{' '}
        No network connection
      </Typography>
    )
  }
}
