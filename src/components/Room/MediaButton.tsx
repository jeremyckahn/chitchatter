import Fab, { FabProps } from '@mui/material/Fab'
import { forwardRef } from 'react'

interface MediaButtonProps extends Partial<FabProps> {
  isActive: boolean
}

export const MediaButton = forwardRef<HTMLButtonElement, MediaButtonProps>(
  ({ isActive, ...props }: MediaButtonProps, ref) => {
    return (
      <Fab
        {...props}
        ref={ref}
        sx={theme =>
          theme.palette.mode === 'dark'
            ? isActive
              ? {
                  color: theme.palette.common.white,
                  background: theme.palette.success.main,
                  '&:hover': {
                    background: theme.palette.success.dark,
                  },
                }
              : {
                  background: theme.palette.grey[500],
                  '&:hover': {
                    background: theme.palette.grey[600],
                  },
                }
            : isActive
              ? {
                  color: theme.palette.common.white,
                  background: theme.palette.success.main,
                  '&:hover': {
                    background: theme.palette.success.dark,
                  },
                }
              : {
                  color: theme.palette.common.black,
                  background: theme.palette.grey[400],
                  '&:hover': {
                    background: theme.palette.grey[500],
                  },
                }
        }
      />
    )
  }
)
