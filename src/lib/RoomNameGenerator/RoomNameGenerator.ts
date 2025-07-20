import { v4 as uuid } from 'uuid'
import { generateSlug } from 'random-word-slugs'

export enum RoomNameType {
  UUID = 'uuid',
  PASSPHRASE = 'passphrase',
}

export class RoomNameGenerator {
  static generate(type: RoomNameType = RoomNameType.UUID): string {
    switch (type) {
      case RoomNameType.PASSPHRASE:
        // Generate 4 words using adjective-noun-adjective-noun pattern for memorable names
        return generateSlug(4, {
          format: 'kebab',
          partsOfSpeech: ['adjective', 'noun', 'adjective', 'noun'],
          categories: {
            adjective: ['color', 'appearance', 'personality'],
            noun: ['animals', 'food', 'technology', 'place'],
          },
        })
      case RoomNameType.UUID:
      default:
        return uuid()
    }
  }
}
