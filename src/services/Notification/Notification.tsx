export class NotificationService {
  permission: NotificationPermission = 'default'

  requestPermission = async () => {
    if (this.permission === 'granted') return

    this.permission = await Notification.requestPermission()
  }

  showNotification = (message: string, options?: NotificationOptions) => {
    if (this.permission !== 'granted') return

    new Notification(message, options)
  }
}

export const notification = new NotificationService()
