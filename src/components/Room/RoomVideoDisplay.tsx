import { useContext, useEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'

import { ShellContext } from 'contexts/ShellContext'

export const RoomVideoDisplay = () => {
  const shellContext = useContext(ShellContext)
  const selfVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const { current: selfVideo } = selfVideoRef
    if (!selfVideo || shellContext.selfVideoStream === null) return

    selfVideo.autoplay = true
    selfVideo.srcObject = shellContext.selfVideoStream
  }, [selfVideoRef, shellContext.selfVideoStream])

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
      <video
        ref={selfVideoRef}
        style={{ margin: '1em', marginTop: 'auto', marginBottom: 'auto' }}
      ></video>
    </Paper>
  )
}
