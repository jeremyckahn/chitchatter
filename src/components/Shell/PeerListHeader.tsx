import { Route, Routes } from 'react-router-dom'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListItem from '@mui/material/ListItem'

import { routes } from 'config/routes'

import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'
import { ConnectionTestResults } from './ConnectionTestResults'

export const StyledHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-start',
}))

interface PeerListWrapperProps {
  onPeerListClose: () => void
  connectionTestResults: IConnectionTestResults
}

export const PeerListHeader = ({
  onPeerListClose,
  connectionTestResults,
}: PeerListWrapperProps) => (
  <StyledHeader>
    <IconButton onClick={onPeerListClose} aria-label="Close peer list">
      <ChevronRightIcon />
    </IconButton>
    <ListItem>
      <Routes>
        {/*
        This stub route is needed to silence spurious warnings in the tests.
        */}
        <Route path={routes.ROOT} element={<></>}></Route>

        {[routes.PUBLIC_ROOM, routes.PRIVATE_ROOM].map(route => (
          <Route
            key={route}
            path={route}
            element={
              <ConnectionTestResults
                connectionTestResults={connectionTestResults}
              />
            }
          />
        ))}
      </Routes>
    </ListItem>
  </StyledHeader>
)
