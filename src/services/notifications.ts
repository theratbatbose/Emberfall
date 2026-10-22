import { LocalNotifications } from '@capacitor/local-notifications';
import type { PlannedReminder } from '../game/reminders';
import { isNative } from './platform';

/**
 * Reminder delivery is hidden behind this interface (decision D1) so the platform can
 * change without touching game code.
 *  - Android app (Capacitor): real OS alarms; fire even when the app is closed.
 *  - Browser / installed PWA: fire only while the app is open or recently backgrounded.
 */
export interface NotificationService {
  readonly kind: 'native' | 'web';
  /** Can reminders fire while the app is fully closed? */
  readonly reliableWhenClosed: boolean;
  permission(): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(): Promise<boolean>;
  /** Replace the whole schedule with this plan. */
  sync(plan: PlannedReminder[]): Promise<void>;
  /** Android 12+: is on-time (exact alarm) delivery allowed? */
  exactAllowed(): Promise<boolean>;
  openExactSettings(): Promise<void>;
}

type InAppHandler = (r: PlannedReminder) => void;
let inAppHandler: InAppHandler | null = null;
/** While the app is visible, reminders also appear as an in-app banner. */
export function onInAppReminder(fn: InAppHandler) {
  inAppHandler = fn;
}

class WebNotificationService implements NotificationService {
  readonly kind = 'web' as const;
  readonly reliableWhenClosed = false;
  private timers: number[] = [];

  async permission() {
    if (typeof Notification === 'undefined') return 'denied' as const;
    return Notification.permission === 'default' ? ('prompt' as const) : Notification.permission;
  }

  async requestPermission() {
    if (typeof Notification === 'undefined') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  async sync(plan: PlannedReminder[]) {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    const now = Date.now();
    for (const r of plan) {
      const delay = r.at - now;
      // setTimeout can't hold more than ~24 days; we only plan 48h anyway.
      if (delay <= 0 || delay > 2 ** 31 - 1) continue;
      this.timers.push(window.setTimeout(() => void this.fire(r), delay));
    }
  }

  private async fire(r: PlannedReminder) {
    if (document.visibilityState === 'visible' && inAppHandler) {
      inAppHandler(r);
      return;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    const options: NotificationOptions = { body: r.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: r.key };
    if (reg) await reg.showNotification(r.title, options);
    else new Notification(r.title, options);
  }

  async exactAllowed() {
    return true;
  }

  async openExactSettings() {}
}

class NativeNotificationService implements NotificationService {
  readonly kind = 'native' as const;
  readonly reliableWhenClosed = true;
  private channelReady = false;

  async permission() {
    const p = await LocalNotifications.checkPermissions();
    return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
  }

  async requestPermission() {
    const p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  }

  private async ensureChannel() {
    if (this.channelReady) return;
    await LocalNotifications.createChannel({
      id: 'reminders',
      name: 'Reminders',
      description: 'Quest reminders, daily nudges and Dungeon Run alerts',
      importance: 4,
      vibration: true,
    });
    this.channelReady = true;
  }

  async sync(plan: PlannedReminder[]) {
    if ((await this.permission()) !== 'granted') return;
    await this.ensureChannel();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const now = Date.now();
    const upcoming = plan.filter((r) => r.at > now + 1000).slice(0, 60);
    if (!upcoming.length) return;
    await LocalNotifications.schedule({
      notifications: upcoming.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        channelId: 'reminders',
        smallIcon: 'ic_stat_ember',
        schedule: { at: new Date(r.at), allowWhileIdle: true },
      })),
    });
  }

  async exactAllowed() {
    try {
      return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
    } catch {
      return true;
    }
  }

  async openExactSettings() {
    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch {
      // Older Android: nothing to change.
    }
  }
}

let service: NotificationService | null = null;
export function notifications(): NotificationService {
  service ??= isNative() ? new NativeNotificationService() : new WebNotificationService();
  return service;
}
