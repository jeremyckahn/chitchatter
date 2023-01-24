import { PropsWithChildren } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import { styled } from '@mui/material/styles'

import { DrawerHeader } from './DrawerHeader'
import { drawerWidth } from './Drawer'
import { peerListWidth } from './PeerList'

const Main = styled('main', {
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
    <Main
      isDrawerOpen={isDrawerOpen}
      isPeerListOpen={isPeerListOpen}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <Collapse in={showAppBar} sx={{ flex: 'none' }}>
        <DrawerHeader />
      </Collapse>
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>{children}</Box>
    </Main>
  )
}
