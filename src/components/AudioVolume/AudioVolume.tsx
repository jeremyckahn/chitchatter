import { useState, useEffect } from 'react'
import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import ListItemIcon from '@mui/material/ListItemIcon'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeDownIcon from '@mui/icons-material/VolumeDown'
import VolumeMuteIcon from '@mui/icons-material/VolumeMute'
import MicIcon from '@mui/icons-material/Mic'
import Tooltip from '@mui/material/Tooltip'

interface AudioVolumeProps {
  audioEl: HTMLAudioElement
}

export const AudioVolume = ({ audioEl }: AudioVolumeProps) => {
  const [audioVolume, setAudioVolume] = useState(audioEl.volume)

  useEffect(() => {
    audioEl.volume = audioVolume
  }, [audioEl, audioVolume])

  const handleIconClick = () => {
    if (audioVolume === 0) {
      setAudioVolume(1)
    } else {
      setAudioVolume(0)
    }
  }

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    value = Array.isArray(value) ? value[0] : value
    setAudioVolume(value / 100)
  }

  const formatLabelValue = () => `${Math.round(audioVolume * 100)}%`

  let VolumeIcon = VolumeUpIcon

  if (audioVolume === 0) {
    VolumeIcon = VolumeMuteIcon
  } else if (audioVolume < 0.5) {
    VolumeIcon = VolumeDownIcon
  }

  return (
    <Box sx={{ display: 'flex', pt: 1, pr: 3, alignItems: 'center' }}>
      <ListItemIcon sx={{ cursor: 'pointer' }} onClick={handleIconClick}>
        <VolumeIcon fontSize="small" />
        {
          // FIXME: Show peer's name
        }
        <Tooltip title="Their microphone volume">
          <MicIcon fontSize="small" sx={{ mx: 1 }} />
        </Tooltip>
      </ListItemIcon>
      <Box display="flex" width={1}>
        <Slider
          aria-label="Volume"
          getAriaValueText={formatLabelValue}
          valueLabelFormat={formatLabelValue}
          valueLabelDisplay="auto"
          onChange={handleSliderChange}
          value={audioVolume * 100}
        ></Slider>
      </Box>
    </Box>
  )
}
