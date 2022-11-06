import { useContext } from 'react'
import Paper from '@mui/material/Paper'

import { Peer } from 'models/chat'
import { ShellContext } from 'contexts/ShellContext'

import { PeerVideo } from './PeerVideo'

type PeerWithVideo = { peer: Peer; videoStream: MediaStream }

export const RoomVideoDisplay = () => {
  const shellContext = useContext(ShellContext)

  const peersWithVideo: PeerWithVideo[] = shellContext.peerList.reduce(
    (acc: PeerWithVideo[], peer: Peer) => {
      const videoStream = shellContext.peerVideoStreams[peer.peerId]
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
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '75%',
      }}
    >
      {shellContext.selfVideoStream && (
        <PeerVideo videoStream={shellContext.selfVideoStream} />
      )}
      {peersWithVideo.map(peerWithVideo => (
        <PeerVideo
          key={peerWithVideo.peer.peerId}
          videoStream={peerWithVideo.videoStream}
        />
      ))}
    </Paper>
  )
}
