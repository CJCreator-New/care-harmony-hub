type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  timestamp: number;
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private idCounter = 0;

  notify(message: string, type: NotificationType = 'info', duration: number = 3000) {
    const id = `notification-${++this.idCounter}`;
    const notification: Notification = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now(),
    };

    this.notifications.push(notification);
    this.notifyListeners();

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  success(message: string, duration?: number) {
    return this.notify(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.notify(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    return this.notify(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    return this.notify(message, 'info', duration);
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.notifications = [];
    this.notifyListeners();
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }
}

export const notificationManager = new NotificationManager();
