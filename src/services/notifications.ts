// src/services/notifications.ts — Robust habit reminder scheduler
import { db } from '../db';
import { format, addDays } from 'date-fns';

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

// ─────────────────────────────────────────────
// Permission Helpers
// ─────────────────────────────────────────────

export const areNotificationsSupported = (): boolean =>
  'Notification' in window && 'serviceWorker' in navigator;

export const getNotificationPermission = (): NotificationPermissionState => {
  if (!areNotificationsSupported())
    return { granted: false, denied: true, default: false };
  const p = Notification.permission;
  return { granted: p === 'granted', denied: p === 'denied', default: p === 'default' };
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// Do Not Disturb
// ─────────────────────────────────────────────

function isInDnDWindow(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  // Handle overnight DnD (e.g., 22:00–07:00)
  if (startMin <= endMin) return nowMin >= startMin && nowMin <= endMin;
  return nowMin >= startMin || nowMin <= endMin;
}

// ─────────────────────────────────────────────
// Schedule reminders (stored in IndexedDB, fired by setTimeout)
// ─────────────────────────────────────────────

let activeTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

export const scheduleAllReminders = async (
  dndStart: string | null = null,
  dndEnd: string | null = null,
): Promise<void> => {
  // Clear previous timers
  activeTimers.forEach((timer) => clearTimeout(timer));
  activeTimers.clear();
  await db.scheduledReminders.clear();

  if (Notification.permission !== 'granted') return;

  const habits = await db.habits.filter((h) => !h.archived && h.notificationsEnabled).toArray();
  const now = new Date();

  for (const habit of habits) {
    const allTimes = [habit.hasTime ? habit.time : null, ...habit.reminders].filter(
      Boolean,
    ) as string[];

    for (const time of allTimes) {
      const [h, m] = time.split(':').map(Number);
      const fireTime = new Date();
      fireTime.setHours(h, m, 0, 0);

      // If already past, schedule for tomorrow
      if (fireTime <= now) fireTime.setDate(fireTime.getDate() + 1);

      const delay = fireTime.getTime() - now.getTime();

      // Store in IDB for persistence across page reloads
      const remId = (await db.scheduledReminders.add({
        habitId: habit.id!,
        habitTitle: habit.title,
        time,
        nextFire: fireTime.getTime(),
      })) as number;

      const timerId = setTimeout(async () => {
        if (!isInDnDWindow(dndStart, dndEnd)) {
          fireNotification(habit.title, time);
        }
        // Re-schedule for the next day
        await db.scheduledReminders.delete(remId);
        scheduleAllReminders(dndStart, dndEnd);
      }, delay);

      activeTimers.set(remId, timerId);
    }
  }
};

function fireNotification(habitTitle: string, time: string): void {
  if (Notification.permission !== 'granted') return;
  new Notification('⏰ Rehabit Techo', {
    body: `Time to: ${habitTitle}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `habit-${habitTitle}-${time}`,
    requireInteraction: false,
  });
}

// ─────────────────────────────────────────────
// Test notification
// ─────────────────────────────────────────────

export const showTestNotification = (): void => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') return;
  new Notification('🎉 Rehabit Techo', {
    body: 'Notifications are working! Your habit reminders will look like this.',
    icon: '/icon-192.png',
  });
};
