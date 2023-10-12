import { PropsWithChildren } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import { styled } from '@mui/material/styles'

import { drawerWidth } from './Drawer'
import { peerListWidth } from './PeerList'

const StyledMain = styled('main', {
  shouldForwardProp: prop =>
    prop !== 'isDrawerOpen' && prop !== 'isPeerListOpen',
})<{
  isDrawerOpen?: boolean
  isPeerListOpen?: boolean
}>(({ theme, isDrawerOpen, isPeerListOpen }) => ({
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  marginRight: `-${peerListWidth}px`,
  ...(isDrawerOpen && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
  ...(isPeerListOpen && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  }),
}))

interface RouteContentProps extends PropsWithChildren {
  isDrawerOpen: boolean
  isPeerListOpen: boolean
  showAppBar: boolean
}

export const RouteContent = ({
  children,
  isDrawerOpen,
  isPeerListOpen,
  showAppBar,
}: RouteContentProps) => {
  return (
    <StyledMain
      isDrawerOpen={isDrawerOpen}
      isPeerListOpen={isPeerListOpen}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {/*
      This Collapse acts as a spacer to allow the controls to hide behind the AppBar.
      */}
      <Collapse in={showAppBar} sx={{ flex: 'none' }}>
        <Box
          sx={theme => ({
            ...theme.mixins.toolbar,
          })}
        />
      </Collapse>
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>{children}</Box>
    </StyledMain>
  )
}
