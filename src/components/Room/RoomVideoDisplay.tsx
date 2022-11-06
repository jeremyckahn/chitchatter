import { useContext, useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'

import { Peer } from 'models/chat'
import { ShellContext } from 'contexts/ShellContext'

import { PeerVideo } from './PeerVideo'

type PeerWithVideo = { peer: Peer; videoStream: MediaStream }

export const RoomVideoDisplay = () => {
  const shellContext = useContext(ShellContext)
  const selfVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: selfVideo } = selfVideoRef
    if (!selfVideo || shellContext.selfVideoStream === null) return

    selfVideo.autoplay = true
    selfVideo.srcObject = shellContext.selfVideoStream
  }, [selfVideoRef, shellContext.selfVideoStream])

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

  const showSelfVideo = Boolean(shellContext.selfVideoStream)

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
      {showSelfVideo && (
        <video
          playsInline
          ref={selfVideoRef}
          style={{ margin: '1em', marginTop: 'auto', marginBottom: 'auto' }}
        />
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
