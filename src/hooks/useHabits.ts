import { useLiveQuery } from "dexie-react-hooks";
import { db, type Habit } from "../db";
import { format, getDay } from "date-fns";
import { syncData } from "../services/sync";

export interface HabitWithStatus extends Habit {
  isScheduledToday: boolean;
  isDoneToday: boolean;
}

export const useHabits = () => {
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const todayDayIndex = getDay(new Date());

  const allHabits = useLiveQuery(() => db.habits.filter(h => !h.archived).toArray());
  const allLogs = useLiveQuery(() => db.logs.toArray());

  // Merge Data & Filter
  const habitsWithStatus: HabitWithStatus[] = allHabits?.map(habit => {
    // 1. Check Frequency (Days of week)
    const isScheduledDay = habit.frequencyDays.includes(todayDayIndex);
    
    // 2. Check Expiry Date (New Logic)
    let isNotExpired = true;
    if (habit.endDate) {
      isNotExpired = todayDateStr <= habit.endDate;
    }

    const isScheduledToday = isScheduledDay && isNotExpired;
    const isDoneToday = allLogs?.some(l => l.habitId === habit.id && l.date === todayDateStr) ?? false;

    return {
      ...habit,
      isScheduledToday,
      isDoneToday,
    };
  }) ?? [];

  // UPDATED Add Action
  const addHabit = async (
    title: string, 
    category: string, 
    color: string, 
    
    // New Args
    type: 'habit' | 'reminder',
    hasTime: boolean,
    time: string,
    endDate: string | null,
    
    frequencyDays: number[]
  ) => {
    await db.habits.add({
      title, category, color, 
      type, hasTime, time, endDate, frequencyDays,
      archived: false, syncStatus: 'pending'
    });
    syncData();
  };

  const toggleHabit = async (habitId: number) => {
    const log = await db.logs.where({ habitId, date: todayDateStr }).first();
    if (log) {
      await db.logs.delete(log.id!);
    } else {
      await db.logs.add({
        habitId,
        date: todayDateStr,
        status: 'done',
        syncStatus: 'pending'
      });
    }
    syncData();
  };

  const deleteHabit = async (id: number) => {
    await db.habits.delete(id);
    syncData();
  };

  const updateHabit = async (id: number, updates: Partial<Habit>) => {
    await db.habits.update(id, {
      ...updates,
      syncStatus: 'pending'
    });
    syncData();
  };

  return {
    habits: habitsWithStatus,
    allLogs: allLogs ?? [],
    addHabit,
    toggleHabit,
    deleteHabit,
    updateHabit,
  };
};