import { PropsWithChildren } from 'react'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItem from '@mui/material/ListItem'

import { PeerListHeader } from 'components/Shell/PeerListHeader'
import { Username } from 'components/Username/Username'
import { AudioState, Peer } from 'models/chat'
import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'

import { PeerListItem } from './PeerListItem'
import { ConnectionTestResults } from './useConnectionTest'
import { ConnectionTestResultsDisplay } from './ConnectionTestResultsDisplay'

export const peerListWidth = 300

export interface PeerListProps extends PropsWithChildren {
  userId: string
  isPeerListOpen: boolean
  onPeerListClose: () => void
  peerList: Peer[]
  peerConnectionTypes: Record<string, PeerConnectionType>
  audioState: AudioState
  peerAudios: Record<string, HTMLAudioElement>
  connectionTestResults: ConnectionTestResults
}

export const PeerList = ({
  userId,
  isPeerListOpen,
  onPeerListClose,
  peerList,
  peerConnectionTypes,
  audioState,
  peerAudios,
  connectionTestResults,
}: PeerListProps) => {
  return (
    <MuiDrawer
      sx={{
        flexShrink: 0,
        pointerEvents: 'none',
        width: peerListWidth,
        '& .MuiDrawer-paper': {
          width: peerListWidth,
          boxSizing: 'border-box',
        },
        ...(isPeerListOpen && {
          pointerEvents: 'auto',
        }),
      }}
      variant="persistent"
      anchor="right"
      open={isPeerListOpen}
    >
      <PeerListHeader>
        <IconButton onClick={onPeerListClose} aria-label="Close peer list">
          <ChevronRightIcon />
        </IconButton>
      </PeerListHeader>
      <Divider />
      <List>
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
        <Divider />
        <ListItem>
          <ConnectionTestResultsDisplay
            connectionTestResults={connectionTestResults}
          />
        </ListItem>
      </List>
    </MuiDrawer>
  )
}
