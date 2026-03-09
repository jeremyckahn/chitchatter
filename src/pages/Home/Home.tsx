import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useTheme from '@mui/material/styles/useTheme'
import { Cached } from '@mui/icons-material'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import styled from '@mui/material/styles/styled'
import GitHubIcon from '@mui/icons-material/GitHub'
import MuiLink from '@mui/material/Link'
import Divider from '@mui/material/Divider'

import Logo from 'img/logo.svg?react'

import { Form, Main } from 'components/Elements'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { EnhancedConnectivityControl } from 'components/EnhancedConnectivityControl'
import { SettingsContext } from 'contexts/SettingsContext'
import { routes } from 'config/routes'
import { RoomNameType } from 'lib/RoomNameGenerator'

import { isEnhancedConnectivityAvailable } from '../../config/enhancedConnectivity'

import { useHome } from './useHome'
import { EmbedCodeDialog } from './EmbedCodeDialog'
import { CommunityRoomSelector } from './CommunityRoomSelector'

const StyledLogo = styled(Logo)({})

export interface HomeProps {
  userId: string
}

export function Home({ userId }: HomeProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { updateUserSettings, getUserSettings } = useContext(SettingsContext)
  const { isEnhancedConnectivityEnabled } = getUserSettings()
  const {
    roomName,
    roomNameType,
    showEmbedCode,
    handleRoomNameChange,
    handleRoomNameTypeChange,
    regenerateRoomName,
    handleFormSubmit,
    handleJoinPublicRoomClick,
    handleJoinPrivateRoomClick,
    handleGetEmbedCodeClick,
    handleEmbedCodeWindowClose,
    isRoomNameValid,
  } = useHome()

  const handleIsEnhancedConnectivityEnabledChange = (
    _event: React.ChangeEvent<{}>,
    newIsEnhancedConnectivityEnabled: boolean
  ) => {
    updateUserSettings({
      isEnhancedConnectivityEnabled: newIsEnhancedConnectivityEnabled,
    })
  }

  return (
    <Box className="Home">
      <EmbedCodeDialog
        showEmbedCode={showEmbedCode}
        handleEmbedCodeWindowClose={handleEmbedCodeWindowClose}
        roomName={roomName}
      />
      <Main
        sx={{
          maxWidth: theme.breakpoints.values.md,
          mt: 3,
          mx: 'auto',
          px: 2,
          textAlign: 'center',
        }}
      >
        <Link to={routes.ABOUT} aria-label={t('home.goToAbout')}>
          <StyledLogo
            sx={{
              px: 0.5,
              pb: 2,
              mx: 'auto',
              maxWidth: theme.breakpoints.values.sm,
            }}
          />
        </Link>
        <Form
          onSubmit={handleFormSubmit}
          sx={{ maxWidth: theme.breakpoints.values.sm, mx: 'auto' }}
        >
          <Typography sx={{ mb: 2 }}>
            {t('home.yourUsername')}{' '}
            <PeerNameDisplay paragraph={false} sx={{ fontWeight: 'bold' }}>
              {userId}
            </PeerNameDisplay>
          </Typography>
          <FormControl fullWidth>
            <TextField
              label={t('home.roomName')}
              variant="outlined"
              value={roomName}
              onChange={handleRoomNameChange}
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label={t('home.regenerateRoomId')}
                    onClick={regenerateRoomName}
                    size="small"
                  >
                    <Cached />
                  </IconButton>
                ),
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
              }}
              size="medium"
            />
          </FormControl>
          <Box sx={{ mt: 2, mb: 2 }}>
            <ToggleButtonGroup
              value={roomNameType}
              exclusive
              onChange={handleRoomNameTypeChange}
              aria-label={t('home.roomNameType')}
              size="small"
            >
              <ToggleButton
                value={RoomNameType.UUID}
                aria-label={t('home.uuid')}
              >
                {t('home.uuid')}
              </ToggleButton>
              <ToggleButton
                value={RoomNameType.PASSPHRASE}
                aria-label={t('home.passphrase')}
              >
                {t('home.passphrase')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mt: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={handleJoinPublicRoomClick}
              sx={{
                marginTop: 2,
              }}
              disabled={!isRoomNameValid}
            >
              {t('home.joinPublicRoom')}
            </Button>
            <Button
              variant="contained"
              onClick={handleJoinPrivateRoomClick}
              sx={{
                marginTop: 2,
                marginLeft: 2,
              }}
              disabled={!isRoomNameValid}
            >
              {t('home.joinPrivateRoom')}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleGetEmbedCodeClick}
              sx={{
                marginTop: 2,
                marginLeft: 2,
              }}
              disabled={!isRoomNameValid}
            >
              {t('home.getEmbedCode')}
            </Button>
          </Box>
        </Form>
      </Main>
      <Box component="section" aria-label={t('home.additionalOptions')}>
        <Divider sx={{ my: 2 }} />
        <Box maxWidth={theme.breakpoints.values.sm} mx="auto" px={2}>
          <CommunityRoomSelector />
        </Box>
        {isEnhancedConnectivityAvailable && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box maxWidth={theme.breakpoints.values.sm} mx="auto" px={2}>
              <EnhancedConnectivityControl
                isEnabled={isEnhancedConnectivityEnabled}
                onChange={handleIsEnhancedConnectivityEnabledChange}
                showSecondaryColor={true}
              />
            </Box>
          </>
        )}
        <Divider sx={{ my: 2 }} />
        <Box
          sx={{
            maxWidth: theme.breakpoints.values.sm,
            mx: 'auto',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Typography variant="body1">{t('home.description')}</Typography>
        </Box>
        <Box
          component="footer"
          sx={{
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <MuiLink
            href="https://github.com/Shannon-x/chitchatter"
            target="_blank"
            sx={() => ({
              color: theme.palette.text.primary,
            })}
          >
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label={t('home.viewSource')}
            >
              <GitHubIcon sx={{ fontSize: '2em' }} />
            </IconButton>
          </MuiLink>
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 1 }}>
            {t('home.license', { license: '' })}
            <MuiLink
              href="https://github.com/Shannon-x/chitchatter/blob/develop/LICENSE"
              target="_blank"
            >
              GPL v2
            </MuiLink>{' '}
            <MuiLink
              href="https://github.com/Shannon-x/chitchatter/blob/develop/README.md"
              target="_blank"
            >
              {t('home.readTheDocs')}
            </MuiLink>
            .
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
