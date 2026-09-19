import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

let channelsInitialized = false;

/**
 * Initialize Notification Channels for Android 8.0+
 */
export async function initNotificationChannels(): Promise<void> {
  if (channelsInitialized) return;
  
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'files_transfers',
        name: 'File Transfers & Downloads',
        description: 'Shows status for active file transfers, downloads and compression',
        importance: 4, // High importance (shows in status bar and banner)
        visibility: 1,
        vibration: true,
      });

      await LocalNotifications.createChannel({
        id: 'files_media',
        name: 'Media Playback',
        description: 'Controls for music and audio playback in background',
        importance: 3, // Normal importance
        visibility: 1,
        vibration: false,
      });

      await LocalNotifications.createChannel({
        id: 'files_general',
        name: 'General & Storage Alerts',
        description: 'Storage alerts, trash reminders, and feedback receipts',
        importance: 3,
        visibility: 1,
        vibration: true,
      });

      channelsInitialized = true;
    } catch (e) {
      console.warn('Error creating notification channels:', e);
    }
  }
}

/**
 * Request notification permissions from Android / OS
 */
export async function requestNativeNotificationPermission(): Promise<boolean> {
  try {
    await initNotificationChannels();

    if (Capacitor.isNativePlatform()) {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') {
        return true;
      }
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
    }
  } catch (err) {
    console.warn('Could not request notification permission:', err);
  }
  return false;
}

/**
 * Check if notification permission is granted
 */
export async function checkNativeNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const check = await LocalNotifications.checkPermissions();
      return check.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Could not check notification permission:', err);
  }
  return false;
}

/**
 * Post a Real Android Status Bar / Notification Shade notification
 */
export async function postNativeSystemNotification(options: {
  id?: number;
  title: string;
  body: string;
  channelId?: 'files_transfers' | 'files_media' | 'files_general';
  extra?: Record<string, any>;
}): Promise<void> {
  const notifId = options.id || Math.floor(Math.random() * 1000000) + 1;
  const channel = options.channelId || 'files_transfers';

  try {
    if (Capacitor.isNativePlatform()) {
      await initNotificationChannels();
      const hasPermission = await checkNativeNotificationPermission();
      if (!hasPermission) {
        await requestNativeNotificationPermission();
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: options.title,
            body: options.body,
            channelId: channel,
            extra: options.extra,
            schedule: { at: new Date(Date.now() + 100) }, // fire immediately
          },
        ],
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: '/favicon.ico',
        data: options.extra,
      });
    }
  } catch (err) {
    console.warn('Error posting native system notification:', err);
  }
}

/**
 * Clear a specific system notification
 */
export async function cancelNativeNotification(id: number): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
    }
  } catch (err) {
    console.warn('Error cancelling native notification:', err);
  }
}
