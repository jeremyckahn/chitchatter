import { PropsWithChildren } from 'react'
import { Route, Routes } from 'react-router-dom'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItem from '@mui/material/ListItem'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { PeerListHeader } from 'components/Shell/PeerListHeader'
import { Username } from 'components/Username/Username'
import { AudioState, Peer } from 'models/chat'
import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'
import { TrackerConnection } from 'services/ConnectionTest/ConnectionTest'
import { routes } from 'config/routes'

import { PeerListItem } from './PeerListItem'
import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'
import { ConnectionTestResults } from './ConnectionTestResults'

export const peerListWidth = 300

export interface PeerListProps extends PropsWithChildren {
  userId: string
  roomId: string | undefined
  onPeerListClose: () => void
  peerList: Peer[]
  peerConnectionTypes: Record<string, PeerConnectionType>
  audioState: AudioState
  peerAudios: Record<string, HTMLAudioElement>
  connectionTestResults: IConnectionTestResults
}

export const PeerList = ({
  userId,
  roomId,
  onPeerListClose,
  peerList,
  peerConnectionTypes,
  audioState,
  peerAudios,
  connectionTestResults,
}: PeerListProps) => {
  return (
    <>
      <PeerListHeader>
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
      </PeerListHeader>
      <Divider />
      <List>
        <Divider />
        <ListItem divider={true}>
          {audioState === AudioState.PLAYING && (
            <ListItemIcon>
              <VolumeUp />
            </ListItemIcon>
          )}
          <ListItemText>
            <Username userId={userId} />
          </ListItemText>
        </ListItem>
        {peerList.map((peer: Peer) => (
          <PeerListItem
            key={peer.peerId}
            peer={peer}
            peerConnectionTypes={peerConnectionTypes}
            peerAudios={peerAudios}
          />
        ))}
        {peerList.length === 0 &&
        typeof roomId === 'string' &&
        connectionTestResults.trackerConnection ===
          TrackerConnection.CONNECTED &&
        connectionTestResults.hasHost ? (
          <>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                m: 2,
              }}
            >
              <CircularProgress size={16} sx={{ mr: 1.5 }} />
              <span>Searching for peers...</span>
            </Box>
          </>
        ) : null}
      </List>
    </>
  )
}
