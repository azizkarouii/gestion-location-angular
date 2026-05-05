import { computed, Injectable, signal } from '@angular/core';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  level: NotificationLevel;
  title: string;
  message: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifications = signal<AppNotification[]>([]);
  readonly items = computed(() => this.notifications());
  readonly count = computed(() => this.notifications().length);

  push(level: NotificationLevel, title: string, message: string): void {
    const notification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      level,
      title,
      message,
      createdAt: new Date(),
    };

    this.notifications.update((current) => [notification, ...current].slice(0, 5));
  }

  clear(id: number): void {
    this.notifications.update((current) => current.filter((item) => item.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }
}
