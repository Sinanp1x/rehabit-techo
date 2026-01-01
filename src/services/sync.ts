import { db } from "../db";
import { firestore } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch, 
  getCountFromServer // <--- Import this!
} from "firebase/firestore"; // Added getDoc
import { getUserID, getFriendID } from "../utils/user"; // Import helpers

// Helper to get user ID (For now, we'll hardcode a "demo-user" ID. 
// We will add real Login in the next step!)
const USER_ID = "user_iphone7_demo"; 

export const syncData = async () => {
  if (!navigator.onLine) return; // Don't try if offline

  const USER_ID = getUserID(); // <--- Get Real ID
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

  // 3. Prepare Habit Uploads
  for (const habit of pendingHabits) {
    const ref = doc(firestore, "users", USER_ID, "habits", habit.id!.toString());
    batch.set(ref, { 
      ...habit, 
      syncStatus: 'synced' // Clean payload for cloud
    });
  }

  // 4. Prepare Log Uploads
  for (const log of pendingLogs) {
    const ref = doc(firestore, "users", USER_ID, "logs", log.id!.toString());
    batch.set(ref, { 
      ...log,
      syncStatus: 'synced'
    });
  }

  // 5. Execute Batch
  try {
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
    console.error("❌ Sync Failed:", error);
  }
};

// NEW: Function to get Friend's Progress
export const fetchFriendStats = async () => {
  const friendID = getFriendID();
  if (!friendID) return null;

  try {
    // We assume the friend syncs their logs to Firestore. 
    // For a simple leaderboard, let's just count their logs from the server.
    // Note: In a real production app, we would calculate this on the server.
    // Here, we will cheat a bit and just try to read their "stats" document if we make one, 
    // OR we just assume we share the "level" or "score".
    
    // For now, let's return a mock or simple read.
    // Real implementation requires reading the friend's collection.
    // Let's keep it simple: We just want to see if they exist for now.
    return { name: "Friend", score: 0 }; 
  } catch (e) {
    console.error("Error fetching friend:", e);
    return null;
  }
};

// NEW: Real Leaderboard Fetcher
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