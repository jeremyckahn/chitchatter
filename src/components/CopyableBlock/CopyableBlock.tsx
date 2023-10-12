import Box, { BoxProps } from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import ContentCopy from '@mui/icons-material/ContentCopy'

interface CopyableBlockProps extends BoxProps {}

export const CopyableBlock = ({ children }: CopyableBlockProps) => {
  const handleCopyClick = () => {}

  return (
    <Box
      sx={{
        position: 'relative',
        '&:hover button': {
          opacity: 1,
        },
      }}
    >
      {children}
      <Fab
        color="default"
        size="small"
        onClick={handleCopyClick}
        sx={theme => ({
          position: 'absolute',
          top: '1em',
          right: '1em',
          opacity: 0,
          transition: theme.transitions.create(['opacity', 'transform']),
        })}
      >
        <ContentCopy />
      </Fab>
    </Box>
  )
}
