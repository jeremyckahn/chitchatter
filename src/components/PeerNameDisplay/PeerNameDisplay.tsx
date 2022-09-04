import Typography, { TypographyProps } from '@mui/material/Typography'
import { funAnimalName } from 'fun-animal-names'

interface PeerNameDisplayProps extends TypographyProps {
  children: string
}

export const PeerNameDisplay = ({
  children,
  ...rest
}: PeerNameDisplayProps) => {
  return <Typography {...rest}>{funAnimalName(children)}</Typography>
}
