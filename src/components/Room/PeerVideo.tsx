import { useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'

import { PeerNameDisplay } from 'components/PeerNameDisplay'

interface PeerVideoProps {
  userId: string
  videoStream: MediaStream
}

export const PeerVideo = ({ userId: peerId, videoStream }: PeerVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: video } = videoRef
    if (!video) return

    video.autoplay = true
    video.srcObject = videoStream
  }, [videoRef, videoStream])

  return (
    <Paper
      sx={{
        py: 2,
        margin: '0.5em',
        flexShrink: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      elevation={10}
    >
      <video
        playsInline
        ref={videoRef}
        style={{
          borderRadius: '1.25em',
          overflow: 'auto',
          padding: '1em',
        }}
      />
      <PeerNameDisplay sx={{ textAlign: 'center', display: 'block' }}>
        {peerId}
      </PeerNameDisplay>
    </Paper>
  )
}
