import { v4 as uuid } from 'uuid'
import { generate } from 'random-words'

export enum RoomNameType {
  UUID = 'uuid',
  PASSPHRASE = 'passphrase',
}

export class RoomNameGenerator {
  static generate(type: RoomNameType = RoomNameType.UUID): string {
    switch (type) {
      case RoomNameType.PASSPHRASE:
        // Generate 4 words and join them with hyphens
        return generate({ exactly: 4, join: '-' })
      case RoomNameType.UUID:
      default:
        return uuid()
    }
  }
}
