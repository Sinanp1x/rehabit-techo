import { db } from "../db";
import { firestore } from "../firebase";
import { 
  collection, 
  doc, 
  writeBatch, 
  getCountFromServer
} from "firebase/firestore";
import { getUserID } from "../utils/user";

export const syncData = async () => {
  if (!navigator.onLine) return;

  try {
    const USER_ID = getUserID();
    console.log("🔄 Syncing as:", USER_ID);
  
    // 1. Get all pending habits
    const pendingHabits = await db.habits
      .where("syncStatus")
      .equals("pending")
      .toArray();

    // 2. Get all pending logs
    const pendingLogs = await db.logs
      .where("syncStatus")
      .equals("pending")
      .toArray();

    if (pendingHabits.length === 0 && pendingLogs.length === 0) {
      console.log("✅ Nothing to sync");
      return;
    }

    const batch = writeBatch(firestore);

    // 3. Prepare Habit Uploads (Top-level collection with userId)
    for (const habit of pendingHabits) {
      const ref = doc(firestore, "habits", habit.id!.toString());
      batch.set(ref, { 
        ...habit, 
        syncStatus: 'synced'
      });
    }

    // 4. Prepare Log Uploads (Top-level collection with userId)
    for (const log of pendingLogs) {
      const ref = doc(firestore, "logs", log.id!.toString());
      batch.set(ref, { 
        ...log,
        syncStatus: 'synced'
      });
    }

    // 5. Execute Batch
    await batch.commit();
    console.log("☁️ Uploaded to Firebase!");

    // 6. Mark local data as synced
    await db.transaction('rw', db.habits, db.logs, async () => {
      for (const h of pendingHabits) {
        await db.habits.update(h.id!, { syncStatus: 'synced' });
      }
      for (const l of pendingLogs) {
        await db.logs.update(l.id!, { syncStatus: 'synced' });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No authenticated user')) {
      console.log("⚠️ Sync skipped: User not logged in");
      return;
    }
    console.error("❌ Sync Failed:", error);
  }
};

// Real Leaderboard Fetcher
export const getFriendScore = async (friendId: string): Promise<number> => {
  try {
    // Reference to friend's logs collection
    const logsRef = collection(firestore, "users", friendId, "logs");
    
    // Count documents on the server (very fast/cheap)
    const snapshot = await getCountFromServer(logsRef);
    
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching friend score:", error);
    return 0; // Return 0 if friend invalid or no internet
  }
};