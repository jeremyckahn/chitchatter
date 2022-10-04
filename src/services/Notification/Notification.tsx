export class NotificationService {
  static permission: NotificationPermission

  static requestPermission = async () => {
    if (NotificationService.permission === 'granted') return

    NotificationService.permission = await Notification.requestPermission()
  }

  static showNotification = (
    message: string,
    options?: NotificationOptions
  ) => {
    if (NotificationService.permission !== 'granted') return

    new Notification(message, options)
  }
}
