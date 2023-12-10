import { saveAs } from 'file-saver'

import { UserSettings } from 'models/settings'
import { serializationService } from 'services/Serialization/Serialization'

export class SettingsService {
  exportSettings = async (userSettings: UserSettings) => {
    const serializedUserSettings =
      await serializationService.serializeUserSettings(userSettings)

    const blob = new Blob([JSON.stringify(serializedUserSettings)], {
      type: 'application/json;charset=utf-8',
    })

    saveAs(blob, `chitchatter-profile-${userSettings.userId}.json`)
  }
}

export const settingsService = new SettingsService()
