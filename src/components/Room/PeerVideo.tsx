import { useEffect, useRef } from 'react'

interface PeerVideoProps {
  videoStream: MediaStream
}

export const PeerVideo = ({ videoStream }: PeerVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: video } = videoRef
    if (!video) return

    video.autoplay = true
    video.srcObject = videoStream
  }, [videoRef, videoStream])

  return (
    <video
      ref={videoRef}
      style={{ margin: '1em', marginTop: 'auto', marginBottom: 'auto' }}
    />
  )
}
