import { saveAs } from 'file-saver'

import { UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'
import {
  isSerializedUserSettings,
  serialization,
} from 'services/Serialization/Serialization'

class InvalidFileError extends Error {
  message = 'InvalidFileError: File could not be imported'
}

const encryptionTestTarget = 'chitchatter'

export class SettingsService {
  exportSettings = async (userSettings: UserSettings) => {
    const serializedUserSettings =
      await serialization.serializeUserSettings(userSettings)

    const blob = new Blob([JSON.stringify(serializedUserSettings)], {
      type: 'application/json;charset=utf-8',
    })

    saveAs(blob, `chitchatter-profile-${userSettings.userId}.json`)
  }

  importSettings = async (file: File) => {
    const fileReader = new FileReader()

    const promise = new Promise<UserSettings>((resolve, reject) => {
      fileReader.addEventListener('loadend', async evt => {
        try {
          const fileReaderResult = evt.target?.result

          if (typeof fileReaderResult !== 'string') {
            throw new Error()
          }

          const parsedFileResult = JSON.parse(fileReaderResult)

          if (!isSerializedUserSettings(parsedFileResult)) {
            throw new Error()
          }

          const deserializedUserSettings =
            await serialization.deserializeUserSettings(parsedFileResult)

          try {
            // First try validating as new signature keys
            const signature = await encryption.signString(
              deserializedUserSettings.privateKey,
              encryptionTestTarget
            )
            const isVerified = await encryption.verifySignature(
              deserializedUserSettings.publicKey,
              signature,
              encryptionTestTarget
            )

            if (!isVerified) {
              throw new Error()
            }
          } catch (_e) {
            // Fallback to legacy encryption validation
            const encryptedString = await encryption.encryptString(
              deserializedUserSettings.publicKey,
              encryptionTestTarget
            )

            const decryptedString = await encryption.decryptString(
              deserializedUserSettings.privateKey,
              encryptedString
            )

            if (decryptedString !== encryptionTestTarget) {
              throw new Error()
            }

            // Key was successfully verified as legacy, so we rotate it to new signature keys
            const newKeyPair = await encryption.generateKeyPair()
            deserializedUserSettings.publicKey = newKeyPair.publicKey
            deserializedUserSettings.privateKey = newKeyPair.privateKey
          }

          resolve(deserializedUserSettings)
        } catch (_e) {
          const err = new InvalidFileError()
          console.error(err)
          reject(err)
        }
      })

      fileReader.readAsText(file.slice())
    })

    return promise
  }
}

export const settings = new SettingsService()
