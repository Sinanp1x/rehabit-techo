import { useLiveQuery } from "dexie-react-hooks";
import { db, type Habit } from "../db";
import { format, getDay } from "date-fns";

export const useHabits = () => {
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const todayDayIndex = getDay(new Date()); // 0 = Sunday, 1 = Monday...

  // Helper: Calculate streak (Handles 'skipped' status)
  const calculateStreak = (logs: { date: string, status: string }[]) => {
    if (logs.length === 0) return 0;
    
    // Sort logs by date descending (Newest first)
    const sorted = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let streak = 0;
    let checkDate = new Date(); // Start checking from Today

    // Helper to format date as string
    const toStr = (d: Date) => d.toISOString().split('T')[0];

    // We loop back day by day
    for (let i = 0; i < 365; i++) { // Check up to a year back
      const dateStr = toStr(checkDate);
      
      // Find log for this specific date
      const log = sorted.find(l => l.date === dateStr);

      if (log) {
        if (log.status === 'done' || log.status === 'partial') {
          streak++; // Standard hit
        } else if (log.status === 'skipped') {
          // Do nothing to streak, but continue the chain!
          // It acts as a bridge.
        }
      } else {
        // No log found for this date.
        // IF it's Today, we forgive it (streak might continue tomorrow).
        // IF it's Yesterday, we forgive it ONLY if we haven't logged today yet.
        // Otherwise, chain is broken.
        if (dateStr !== today) {
          // If we missed yesterday and it wasn't skipped, streak is over.
          // Exception: If today is marked done, we continue checking. 
          // But here we are iterating backwards.
          
          // Simple Logic: Stop if we hit a missing day that isn't Today.
          break; 
        }
      }

      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    return streak;
  };

  // 1. Get ALL active habits
  const allHabits = useLiveQuery(() => 
    db.habits.filter(h => !h.archived).toArray()
  );

  // 2. Get Today's Logs
  const todayLogs = useLiveQuery(() => 
    db.logs.where("date").equals(todayDateStr).toArray()
  );

  // Get ALL logs once (for efficiency)
  const allLogs = useLiveQuery(() => db.logs.toArray());

  // 3. Filter & Merge: Only show habits scheduled for TODAY
  const habitsWithStatus = allHabits?.filter(habit => {
    // If no frequency set, assume Daily (show everyday)
    if (!habit.frequencyDays || habit.frequencyDays.length === 0) return true;
    // Otherwise, check if today is in the schedule
    return habit.frequencyDays.includes(todayDayIndex);
  }).map(habit => {
    const log = todayLogs?.find(l => l.habitId === habit.id);
    const currentValue = log?.value || 0;
    
    // NEW: Filter logs for THIS habit only to calc streak
    const habitLogs = allLogs?.filter(l => l.habitId === habit.id) || [];
    const currentStreak = calculateStreak(habitLogs); // <--- Use new calc

    return {
      ...habit,
      currentValue, // How much done today
      streak: currentStreak, // <--- Add this property
      completed: currentValue >= (habit.targetValue || 1), // Is goal met?
      completedId: log?.id,
      status: log?.status // <--- Pass status (skipped/done) to UI
    };
  }) ?? [];

  // Action: Add Habit (Updated with Goal & Schedule)
  const addHabit = async (
    title: string, 
    category: Habit['category'], 
    targetValue: number, 
    unit: string, 
    frequencyDays: number[]
  ) => {
    await db.habits.add({
      title,
      category,
      targetValue,
      unit,
      frequencyDays,
      archived: false,
      syncStatus: 'pending'
    });
  };

  // Action: Delete Habit
  const deleteHabit = async (id: number) => {
    if (confirm("Delete this habit permanently?")) {
      await db.habits.delete(id);
      // Optional: Delete associated logs if you want a clean slate
      // await db.logs.where("habitId").equals(id).delete();
    }
  };

  // Action: Toggle (Now handles increments)
  const toggleHabit = async (habitId: number, currentVal: number, target: number, logId?: number) => {
    // Simple logic: If not done, mark fully done. If done, uncheck.
    // (We will add "Partial" increments later)
    
    if (currentVal >= target) {
      // It's done, so remove log (Undo)
      if (logId) await db.logs.delete(logId);
    } else {
      // It's not done, so mark as Full Goal Reached
      await db.logs.add({
        habitId,
        date: todayDateStr,
        status: 'done',
        value: target, // Max out the value
        syncStatus: 'pending'
      });
    }
  };

  // Add this helper function inside useHabits
  const getHabitHistory = async (habitId: number) => {
    // Get last 10 logs for this habit, ordered by date desc
    return await db.logs
      .where("habitId")
      .equals(habitId)
      .reverse() // Newest first
      .limit(10)
      .toArray();
  };

  // Update the updateProgress function to accept a NOTE
  // Update the signature to accept 'status'
  const updateProgress = async (
    habitId: number, 
    newValue: number, 
    note?: string, 
    statusOverride?: 'skipped' | 'done' | 'partial' // <--- New Param
  ) => {
    const todayLogs = await db.logs.where({ habitId, date: todayDateStr }).toArray();
    
    // Determine status automatically if not provided
    let status: 'done' | 'partial' | 'skipped' = 'partial';
    if (statusOverride) {
      status = statusOverride;
    } else {
      status = newValue >= 1 ? 'partial' : 'skipped';
      // Ideally we check targetValue here, but 'partial' is fine for "some progress"
    }

    if (todayLogs.length > 0) {
      await db.logs.update(todayLogs[0].id!, { 
        value: newValue,
        status: status, 
        note: note,
        syncStatus: 'pending'
      });
    } else {
      await db.logs.add({
        habitId,
        date: todayDateStr,
        status: status,
        value: newValue,
        note: note || "",
        syncStatus: 'pending'
      });
    }
  };

  return {
    habits: habitsWithStatus,
    allLogs: useLiveQuery(() => db.logs.toArray()),
    addHabit,
    deleteHabit,
    toggleHabit,
    updateProgress,
    getHabitHistory // <--- Export this
  };
};