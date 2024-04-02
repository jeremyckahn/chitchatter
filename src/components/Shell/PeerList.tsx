import { PropsWithChildren } from 'react'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItem from '@mui/material/ListItem'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { UserInfo } from 'components/UserInfo'
import {
  AudioState,
  Peer,
  AudioChannel,
  AudioChannelName,
  PeerAudioChannelState,
} from 'models/chat'
import { PeerConnectionType } from 'lib/PeerRoom'
import { TrackerConnection } from 'lib/ConnectionTest'

import { PeerListHeader } from './PeerListHeader'
import { PeerListItem } from './PeerListItem'
import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

export const peerListWidth = 300

export interface PeerListProps extends PropsWithChildren {
  userId: string
  roomId: string | undefined
  onPeerListClose: () => void
  peerList: Peer[]
  peerConnectionTypes: Record<string, PeerConnectionType>
  peerAudioChannelState: PeerAudioChannelState
  peerAudioChannels: Record<string, AudioChannel>
  connectionTestResults: IConnectionTestResults
}

export const PeerList = ({
  userId,
  roomId,
  onPeerListClose,
  peerList,
  peerConnectionTypes,
  peerAudioChannelState,
  peerAudioChannels,
  connectionTestResults,
}: PeerListProps) => {
  return (
    <>
      <PeerListHeader
        onPeerListClose={onPeerListClose}
        connectionTestResults={connectionTestResults}
      />
      <Divider />
      <List>
        <ListItem divider={true}>
          {peerAudioChannelState[AudioChannelName.MICROPHONE] ===
            AudioState.PLAYING && (
            <ListItemIcon>
              <VolumeUp />
            </ListItemIcon>
          )}
          <ListItemText>
            <UserInfo userId={userId} />
          </ListItemText>
        </ListItem>
        {peerList.map((peer: Peer) => (
          <PeerListItem
            key={peer.peerId}
            peer={peer}
            peerConnectionTypes={peerConnectionTypes}
            peerAudioChannels={peerAudioChannels}
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
