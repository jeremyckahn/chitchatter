import { useContext } from 'react'
import Paper from '@mui/material/Paper'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { Peer } from 'models/chat'

import { PeerVideo } from './PeerVideo'

type PeerWithVideo = { peer: Peer; videoStream: MediaStream }

export interface RoomVideoDisplayProps {
  userId: string
}

export const RoomVideoDisplay = ({ userId }: RoomVideoDisplayProps) => {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)

  const { peerList } = shellContext
  const { peerVideoStreams, selfVideoStream } = roomContext

  const peersWithVideo: PeerWithVideo[] = peerList.reduce(
    (acc: PeerWithVideo[], peer: Peer) => {
      const videoStream = peerVideoStreams[peer.peerId]
      if (videoStream) {
        acc.push({
          peer,
          videoStream,
        })
      }

      return acc
    },
    []
  )

  return (
    <Paper
      className="RoomVideoDisplay"
      elevation={3}
      square
      sx={{
        alignItems: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'center',
        overflow: 'auto',
        width: '75%',
      }}
    >
      {selfVideoStream && (
        <PeerVideo isSelf userId={userId} videoStream={selfVideoStream} />
      )}
      {peersWithVideo.map(peerWithVideo => (
        <PeerVideo
          key={peerWithVideo.peer.peerId}
          userId={peerWithVideo.peer.userId}
          videoStream={peerWithVideo.videoStream}
        />
      ))}
    </Paper>
  )
}
