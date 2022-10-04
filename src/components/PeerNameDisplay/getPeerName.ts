import { funAnimalName } from 'fun-animal-names'

export const getPeerName = (peerId: string) => {
  return funAnimalName(peerId)
}
