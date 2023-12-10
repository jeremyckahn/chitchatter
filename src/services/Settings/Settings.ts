import { saveAs } from 'file-saver'

import { UserSettings } from 'models/settings'
import { serializationService } from 'services/Serialization/Serialization'

class InvalidFileError extends Error {
  message = 'InvalidFileError: File could not be imported'
}

export class SettingsService {
  exportSettings = async (userSettings: UserSettings) => {
    const serializedUserSettings =
      await serializationService.serializeUserSettings(userSettings)

    const blob = new Blob([JSON.stringify(serializedUserSettings)], {
      type: 'application/json;charset=utf-8',
    })

    saveAs(blob, `chitchatter-profile-${userSettings.userId}.json`)
  }

  importSettings = async (file: File) => {
    const fileReader = new FileReader()

    const promise = new Promise<void>((resolve, reject) => {
      fileReader.addEventListener('loadend', evt => {
        try {
          const result = evt.target?.result

          if (typeof result !== 'string') {
            throw new InvalidFileError()
          }

          // FIXME: Validate and import file

          resolve()
        } catch (e) {
          console.error(e)
          reject(e)
        }
      })

      fileReader.readAsText(file.slice())
    })

    return promise
  }
}

export const settingsService = new SettingsService()
