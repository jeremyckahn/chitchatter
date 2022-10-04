import { Component, ErrorInfo, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'

import { routes } from 'config/routes'

interface Props {
  children?: ReactNode
}

interface State {
  error: Error | null
  showError: boolean
}

// Adapted from https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/error_boundaries/
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    error: null,
    showError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { error, showError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.error && this.state.showError) {
      const { name, message, stack } = this.state.error

      return (
        <Box>
          <Alert
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  this.setState({ error: null, showError: false })
                }}
              >
                <Link to={routes.ROOT}>
                  <CloseIcon fontSize="inherit" />
                </Link>
              </IconButton>
            }
          >
            <Typography variant="h2">
              <pre>{name}</pre>
            </Typography>
            <Typography variant="h3">
              <code>{message}</code>
            </Typography>
            <pre>{stack}</pre>
          </Alert>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
