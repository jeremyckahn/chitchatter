import { PropsWithChildren } from 'react'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'

import { DrawerHeader } from './DrawerHeader'
import { drawerWidth } from './Drawer'

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })<{
  open?: boolean
}>(({ theme, open }) => ({
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}))

interface RouteContentProps extends PropsWithChildren {
  isDrawerOpen: boolean
}

export const RouteContent = ({ children, isDrawerOpen }: RouteContentProps) => {
  return (
    <Main
      open={isDrawerOpen}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <DrawerHeader />
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>{children}</Box>
    </Main>
  )
}
