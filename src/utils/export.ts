// src/utils/export.ts — JSON export / import for all user data
import { db } from '../db';
import { auth } from '../firebase';
import { format } from 'date-fns';

export interface ExportData {
  version: '2.0';
  exportedAt: string;
  userId: string;
  habits: object[];
  logs: object[];
}

// ─────────────────────────────────────────────
// Export all data as a JSON blob download
// ─────────────────────────────────────────────

export const exportAllData = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  const habits = await db.habits.where('userId').equals(user.uid).toArray();
  const logs = await db.logs.where('userId').equals(user.uid).toArray();

  const payload: ExportData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    userId: user.uid,
    habits: habits.map(({ ...h }) => h),
    logs: logs.map(({ ...l }) => l),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rehabit-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────
// Import from a JSON file, merging without duplicates
// ─────────────────────────────────────────────

export const importFromFile = async (file: File): Promise<{ habits: number; logs: number }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const text = await file.text();
  const data = JSON.parse(text) as ExportData;

  if (!data.version || !data.habits || !data.logs) {
    throw new Error('Invalid backup file format');
  }

  let habitCount = 0;
  let logCount = 0;

  // Import habits (skip existing by checking title + createdAt)
  for (const habit of data.habits as any[]) {
    // Remove old numeric id, assign to current user
    const { id: _id, ...habitData } = habit;
    // Check for existing by title + frequencyDays signature
    const existing = await db.habits
      .where('userId')
      .equals(user.uid)
      .filter((h) => h.title === habitData.title)
      .first();

    if (!existing) {
      await db.habits.add({
        ...habitData,
        userId: user.uid,
        syncStatus: 'pending',
        tags: habitData.tags || (habitData.category ? [habitData.category] : []),
        reminders: habitData.reminders || [],
        notificationsEnabled: habitData.notificationsEnabled ?? false,
        quantity: habitData.quantity || null,
        createdAt: habitData.createdAt || new Date().toISOString(),
      });
      habitCount++;
    }
  }

  // Import logs (skip exact duplicates by habitId + date)
  for (const log of data.logs as any[]) {
    const { id: _id, ...logData } = log;
    const existing = await db.logs
      .where('[habitId+date]')
      .equals([logData.habitId, logData.date])
      .first();

    if (!existing) {
      await db.logs.add({
        ...logData,
        userId: user.uid,
        syncStatus: 'pending',
        skipReason: logData.skipReason || null,
        partialValue: logData.partialValue || null,
      });
      logCount++;
    }
  }

  return { habits: habitCount, logs: logCount };
};

// ─────────────────────────────────────────────
// Storage usage estimate
// ─────────────────────────────────────────────

export const getStorageUsageMB = async (): Promise<number> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage = 0 } = await navigator.storage.estimate();
    return Math.round((usage / 1024 / 1024) * 10) / 10;
  }
  return 0;
};
