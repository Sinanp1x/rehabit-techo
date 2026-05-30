// src/utils/migration.ts — Migrate old DB schema data to v5
import { db } from '../db';
import { auth } from '../firebase';

export const migrateExistingData = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const allHabits = await db.habits.toArray();
    let migrated = 0;

    for (const habit of allHabits) {
      const updates: Partial<typeof habit> = {};

      // Add userId if missing
      if (!habit.userId) updates.userId = user.uid;

      // Migrate single category → tags array
      if (!habit.tags || habit.tags.length === 0) {
        const cat = (habit as any).category;
        updates.tags = cat ? [cat] : ['General'];
      }

      // Add missing fields with defaults
      if (habit.reminders === undefined) updates.reminders = [];
      if (habit.notificationsEnabled === undefined)
        updates.notificationsEnabled = habit.hasTime ?? false;
      if (habit.quantity === undefined) updates.quantity = null;
      if (!habit.createdAt) updates.createdAt = new Date().toISOString();

      if (Object.keys(updates).length > 0) {
        await db.habits.update(habit.id!, { ...updates, syncStatus: 'pending', updatedAt: Date.now() });
        migrated++;
      }
    }

    const allLogs = await db.logs.toArray();
    for (const log of allLogs) {
      const updates: Partial<typeof log> = {};
      if (!log.userId) updates.userId = user.uid;
      if (log.skipReason === undefined) updates.skipReason = null;
      if (log.partialValue === undefined) updates.partialValue = null;
      if ((log.status as string) !== 'done' && (log.status as string) !== 'partial' && (log.status as string) !== 'skip')
        updates.status = 'done';
      if (Object.keys(updates).length > 0) {
        await db.logs.update(log.id!, { ...updates, syncStatus: 'pending', updatedAt: Date.now() });
      }
    }

    if (migrated > 0) {
      console.log(`✅ Migrated ${migrated} habits to v5 schema`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
