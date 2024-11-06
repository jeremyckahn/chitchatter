import { useState, SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { communityRoomNames } from 'config/communityRooms'

export const CommunityRoomSelector = () => {
  const navigate = useNavigate()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  const handleRoomNameChange = (
    _event: SyntheticEvent<Element, Event>,
    roomName: string | null
  ) => {
    setSelectedRoom(roomName)
  }

  const handleJoinClick = () => {
    navigate(`/public/${selectedRoom}`)
  }

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1-content"
        id="panel1-header"
        sx={{
          fontWeight: 'bold',
        }}
      >
        Community rooms
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body1">
          You can also chat in a public community room. You'll be anonymous, but
          be careful what information you choose to share.
        </Typography>
        <Box display="flex" mt={2} gap={1}>
          <Autocomplete
            disablePortal
            options={communityRoomNames}
            value={selectedRoom}
            renderInput={params => <TextField {...params} label="Room" />}
            onChange={handleRoomNameChange}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            disabled={selectedRoom === null}
            onClick={handleJoinClick}
          >
            Join
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
