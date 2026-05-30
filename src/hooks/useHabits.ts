// src/hooks/useHabits.ts — Upgraded hook with partial/skip support and streak data
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Habit, type LogStatus } from '../db';
import { format, getDay, startOfMonth } from 'date-fns';
import { syncData } from '../services/sync';
import { auth } from '../firebase';
import { getCurrentStreak, getLongestStreak } from '../utils/stats';
import { useStore } from '../store/useStore';

export interface HabitWithStatus extends Habit {
  isScheduledToday: boolean;
  isDoneToday: boolean;
  logStatusToday: LogStatus | null;
  currentStreak: number;
  longestStreak: number;
}

export const useHabits = () => {
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const todayDayIndex = getDay(new Date());
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const user = auth.currentUser;
  const userId = user?.uid;
  const { addToast } = useStore();

  const allHabits = useLiveQuery(
    () => (userId ? db.habits.filter((h) => !h.archived && h.userId === userId).toArray() : []),
    [userId],
  );

  const allLogs = useLiveQuery(
    () => (userId ? db.logs.where('userId').equals(userId).and((log) => log.date >= currentMonthStart).toArray() : []),
    [userId],
  );

  const habitsWithStatus: HabitWithStatus[] = (allHabits ?? []).map((habit) => {
    const isScheduledDay = habit.frequencyDays.includes(todayDayIndex);
    const isNotExpired = habit.endDate ? todayDateStr <= habit.endDate : true;
    const isScheduledToday = isScheduledDay && isNotExpired;

    const todayLog = (allLogs ?? []).find(
      (l) => l.habitId === habit.id && l.date === todayDateStr,
    );
    const isDoneToday =
      !!todayLog && (todayLog.status === 'done' || todayLog.status === 'partial');
    const logStatusToday = todayLog?.status ?? null;

    const currentStreak = getCurrentStreak(habit.id!, allLogs ?? [], habit);
    const longestStreak = getLongestStreak(habit.id!, allLogs ?? [], habit);

    return {
      ...habit,
      isScheduledToday,
      isDoneToday,
      logStatusToday,
      currentStreak,
      longestStreak,
    };
  });

  // ── Add Habit ──────────────────────────────────

  const addHabit = async (data: Omit<Habit, 'id' | 'userId' | 'archived' | 'syncStatus'>) => {
    const user = auth.currentUser;
    if (!user) return;
    const tempId = await db.habits.add({
      ...data,
      userId: user.uid,
      archived: false,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    });
    const synced = await syncData();
    if (synced === false) {
      await db.habits.delete(tempId);
      addToast('Habit save failed. Local change was rolled back.', 'error');
    }
  };

  // ── Log Habit (done / partial / skip) ─────────

  const logHabit = async (
    habitId: number,
    status: LogStatus,
    options?: { skipReason?: string; partialValue?: number },
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    const existing = await db.logs.where({ habitId, date: todayDateStr }).first();
    if (existing) {
      const previous = { ...existing };
      if (existing.status === status) {
        // Toggle off — remove the log
        await db.logs.delete(existing.id!);
      } else {
        // Update to new status
        await db.logs.update(existing.id!, {
          status,
          skipReason: options?.skipReason ?? null,
          partialValue: options?.partialValue ?? null,
          syncStatus: 'pending',
          updatedAt: Date.now(),
        });
      }
      const synced = await syncData();
      if (synced === false) {
        if (existing.status === status) {
          await db.logs.put(previous);
        } else {
          await db.logs.put({
            ...previous,
            status,
            skipReason: options?.skipReason ?? null,
            partialValue: options?.partialValue ?? null,
            syncStatus: 'pending',
            updatedAt: Date.now(),
          });
        }
        addToast('Log save failed. Local change was rolled back.', 'error');
      }
    } else {
      const newLog = {
        userId: user.uid,
        habitId,
        date: todayDateStr,
        status,
        skipReason: options?.skipReason ?? null,
        partialValue: options?.partialValue ?? null,
        syncStatus: 'pending' as const,
        updatedAt: Date.now(),
      };
      // Capture the returned id for a deterministic rollback — no secondary query
      const newId = await db.logs.add({ ...newLog });
      const synced = await syncData();
      if (synced === false) {
        await db.logs.delete(newId);
        addToast('Log save failed. Local change was rolled back.', 'error');
      }
    }
  };

  // ── Legacy toggle (backwards compat) ──────────

  const toggleHabit = (habitId: number) => logHabit(habitId, 'done');

  // ── Update Habit ───────────────────────────────

  const updateHabit = async (id: number, updates: Partial<Habit>) => {
    const previous = await db.habits.get(id);
    await db.habits.update(id, { ...updates, syncStatus: 'pending', updatedAt: Date.now() });
    const synced = await syncData();
    if (synced === false && previous) {
      await db.habits.put(previous);
      addToast('Habit update failed. Local change was rolled back.', 'error');
    }
  };

  // ── Delete Habit ───────────────────────────────

  const deleteHabit = async (id: number) => {
    const previous = await db.habits.get(id);
    await db.habits.update(id, { archived: true, syncStatus: 'pending', updatedAt: Date.now() });
    const synced = await syncData();
    if (synced === false && previous) {
      await db.habits.put(previous);
      addToast('Habit delete failed. Local change was rolled back.', 'error');
    }
  };

  return {
    habits: habitsWithStatus,
    allLogs: allLogs ?? [],
    addHabit,
    logHabit,
    toggleHabit,
    updateHabit,
    deleteHabit,
  };
};