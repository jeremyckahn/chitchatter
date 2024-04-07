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

          const encryptedString = await encryption.encryptString(
            deserializedUserSettings.publicKey,
            encryptionTestTarget
          )

          const decryptedString = await encryption.decryptString(
            deserializedUserSettings.privateKey,
            encryptedString
          )

          // NOTE: This determines whether the public and private keys match
          // and are compatible with Chitchatter.
          if (decryptedString !== encryptionTestTarget) {
            throw new Error()
          }

          resolve(deserializedUserSettings)
        } catch (e) {
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
