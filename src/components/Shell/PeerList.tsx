import { PropsWithChildren } from 'react'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import VolumeUp from '@mui/icons-material/VolumeUp'
import ListItem from '@mui/material/ListItem'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { UserInfo } from 'components/UserInfo'
import {
  AudioState,
  Peer,
  AudioChannelName,
  PeerAudioChannelState,
} from 'core/models/chat'
import { AudioChannel } from 'models/media'
import { PeerConnectionType } from 'core/transport/types'
import { TrackerConnection } from 'lib/ConnectionTest'

import { PeerListHeader } from './PeerListHeader'
import { PeerListItem } from './PeerListItem'
import { ConnectionTestResults as IConnectionTestResults } from './useConnectionTest'

export const peerListWidth = 300

export const privateRoomEmptyHint =
  'Not seeing anyone? Others only appear if they entered the same password. If it matches, ask them to reload the page to get the latest version of Chitchatter.'

export interface PeerListProps extends PropsWithChildren {
  userId: string
  roomId: string | undefined
  onPeerListClose: () => void
  peerList: readonly Peer[]
  peerConnectionTypes: Readonly<Record<string, PeerConnectionType>>
  peerAudioChannelState: PeerAudioChannelState
  peerAudioChannels: Record<string, AudioChannel>
  connectionTestResults: IConnectionTestResults
  /**
   * Whether the room is password protected. Peers who entered a different
   * password — or run a version that derives the room key differently — are
   * silently invisible, so an empty private room explains why.
   */
  isPrivateRoom: boolean
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
  isPrivateRoom,
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
            roomId={roomId ?? ''}
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
            {isPrivateRoom && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mx: 2, mb: 2 }}
              >
                {privateRoomEmptyHint}
              </Typography>
            )}
          </>
        ) : null}
      </List>
    </>
  )
}
