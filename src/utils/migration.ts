// Migration utility to add userId to existing habits and logs
import { db } from "../db";
import { auth } from "../firebase";

export const migrateExistingData = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log("⚠️ Migration skipped: No user logged in");
    return;
  }

  try {
    // Get all habits without userId
    const allHabits = await db.habits.toArray();
    const habitsToUpdate = allHabits.filter(h => !h.userId);
    
    // Get all logs without userId
    const allLogs = await db.logs.toArray();
    const logsToUpdate = allLogs.filter(l => !l.userId);
    
    if (habitsToUpdate.length === 0 && logsToUpdate.length === 0) {
      console.log("✅ No data needs migration");
      return;
    }

    console.log(`🔄 Migrating ${habitsToUpdate.length} habits and ${logsToUpdate.length} logs...`);

    // Update habits with userId
    for (const habit of habitsToUpdate) {
      if (habit.id) {
        await db.habits.update(habit.id, {
          userId: user.uid,
          syncStatus: 'pending' // Mark for re-sync
        });
      }
    }

    // Update logs with userId
    for (const log of logsToUpdate) {
      if (log.id) {
        await db.logs.update(log.id, {
          userId: user.uid,
          syncStatus: 'pending' // Mark for re-sync
        });
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
};
