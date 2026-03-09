import { useState, SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        {t('communityRooms.title')}
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body1">
          {t('communityRooms.description')}
        </Typography>
        <Box display="flex" mt={2} gap={1}>
          <Autocomplete
            disablePortal
            options={communityRoomNames}
            value={selectedRoom}
            renderInput={params => (
              <TextField {...params} label={t('communityRooms.room')} />
            )}
            onChange={handleRoomNameChange}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            disabled={selectedRoom === null}
            onClick={handleJoinClick}
          >
            {t('common.join')}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
