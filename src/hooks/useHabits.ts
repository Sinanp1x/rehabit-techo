import { useLiveQuery } from "dexie-react-hooks";
import { db, type Habit } from "../db";
import { format, getDay } from "date-fns";
import { syncData } from "../services/sync";
import { auth } from "../firebase"; // <--- 1. IMPORT AUTH

export interface HabitWithStatus extends Habit {
  isScheduledToday: boolean;
  isDoneToday: boolean;
}

export const useHabits = () => {
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const todayDayIndex = getDay(new Date());

  // Get current user ID for filtering
  const user = auth.currentUser;
  const userId = user?.uid;

  // Filter by userId to match Firestore security rules
  const allHabits = useLiveQuery(() => {
    if (!userId) return [];
    return db.habits.filter(h => !h.archived && h.userId === userId).toArray();
  }, [userId]);
  
  const allLogs = useLiveQuery(() => {
    if (!userId) return [];
    return db.logs.where({ userId }).toArray();
  }, [userId]);

  // Merge Data & Filter
  const habitsWithStatus: HabitWithStatus[] = allHabits?.map(habit => {
    // 1. Check Frequency (Days of week)
    const isScheduledDay = habit.frequencyDays.includes(todayDayIndex);
    
    // 2. Check Expiry Date
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
    type: 'habit' | 'reminder',
    hasTime: boolean,
    time: string,
    endDate: string | null,
    frequencyDays: number[]
  ) => {
    // <--- 2. GET CURRENT USER ID
    const user = auth.currentUser;
    if (!user) {
        console.error("Cannot add habit: No user logged in");
        return;
    }

    await db.habits.add({
      userId: user.uid, // <--- 3. SAVE USER ID (Critical for Security Rules)
      title, category, color, 
      type, hasTime, time, endDate, frequencyDays,
      archived: false, syncStatus: 'pending'
    });
    syncData();
  };

  const toggleHabit = async (habitId: number) => {
    const user = auth.currentUser; // Get User
    if (!user) return;

    const log = await db.logs.where({ habitId, date: todayDateStr }).first();
    
    if (log) {
      await db.logs.delete(log.id!);
    } else {
      await db.logs.add({
        userId: user.uid, // <--- 4. SAVE ID TO LOGS TOO
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