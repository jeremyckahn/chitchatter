import { funAnimalName } from 'fun-animal-names'

interface PeerNameDisplayProps {
  children: string
}

export const PeerNameDisplay = ({ children }: PeerNameDisplayProps) => {
  return <>{funAnimalName(children)}</>
}
