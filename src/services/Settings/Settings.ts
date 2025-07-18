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
  // Hàm để xuất cài đặt người dùng
  exportSettings = async (userSettings: UserSettings) => {
    // Serialize thông tin người dùng (bao gồm ID người dùng và chatType)
    const serializedUserSettings =
      await serialization.serializeUserSettings(userSettings)

    const blob = new Blob([JSON.stringify(serializedUserSettings)], {
      type: 'application/json;charset=utf-8',
    })

    // Lưu file dưới dạng JSON
    saveAs(blob, `chitchatter-profile-${userSettings.userId}.json`)
  }

  // Hàm để nhập cài đặt người dùng từ file
  importSettings = async (file: File) => {
    const fileReader = new FileReader()

    const promise = new Promise<UserSettings>((resolve, reject) => {
      fileReader.addEventListener('loadend', async evt => {
        try {
          const fileReaderResult = evt.target?.result

          if (typeof fileReaderResult !== 'string') {
            throw new Error()
          }

          // Parse nội dung file JSON
          const parsedFileResult = JSON.parse(fileReaderResult)

          if (!isSerializedUserSettings(parsedFileResult)) {
            throw new Error()
          }

          // Deserialize dữ liệu người dùng (bao gồm ID người dùng và chatType)
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

          // Kiểm tra nếu publicKey và privateKey khớp và tương thích với Chitchatter
          if (decryptedString !== encryptionTestTarget) {
            throw new Error()
          }

          resolve(deserializedUserSettings)
        } catch (_e) {
          const err = new InvalidFileError()
          console.error(err)
          reject(err)
        }
      })

      // Đọc file dưới dạng text
      fileReader.readAsText(file.slice())
    })

    return promise
  }
}

export const settings = new SettingsService()
