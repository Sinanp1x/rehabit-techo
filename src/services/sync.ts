// src/services/sync.ts — E2EE-aware Firestore sync with offline queue
import { db } from '../db';
import { firestore, auth } from '../firebase';
import {
  collection,
  doc,
  writeBatch,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { encryptData } from './crypto';

function getUserId(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
}

// ─────────────────────────────────────────────
// Prepare payload (encrypt if E2EE enabled)
// ─────────────────────────────────────────────

async function preparePayload(data: object): Promise<object> {
  const { e2ee } = useStore.getState();
  if (e2ee.enabled && e2ee.key) {
    const encrypted = await encryptData(e2ee.key, JSON.stringify(data));
    return { _encrypted: true, ciphertext: encrypted.ciphertext, iv: encrypted.iv };
  }
  return data;
}

// ─────────────────────────────────────────────
// Main sync function
// ─────────────────────────────────────────────

export const syncData = async (): Promise<void> => {
  const { isOnline, batteryMode } = useStore.getState();
  if (!isOnline) return;

  // In battery mode, skip sync unless queue is large
  const pendingCount = await db.pendingWrites.count();
  if (batteryMode && pendingCount < 5) return;

  try {
    const USER_ID = getUserId();

    const pendingHabits = await db.habits.where('syncStatus').equals('pending').toArray();
    const pendingLogs = await db.logs.where('syncStatus').equals('pending').toArray();

    if (pendingHabits.length === 0 && pendingLogs.length === 0) return;

    // Batch writes (Firestore limit: 500 per batch)
    const BATCH_SIZE = 400;
    const allWrites: (() => Promise<void>)[] = [];

    for (const habit of pendingHabits) {
      allWrites.push(async () => {
        const payload = await preparePayload({ ...habit, syncStatus: 'synced' });
        const ref = doc(firestore, 'users', USER_ID, 'habits', habit.id!.toString());
        await setDoc(ref, payload);
        await db.habits.update(habit.id!, { syncStatus: 'synced' });
      });
    }

    for (const log of pendingLogs) {
      allWrites.push(async () => {
        const payload = await preparePayload({ ...log, syncStatus: 'synced' });
        const ref = doc(firestore, 'users', USER_ID, 'logs', log.id!.toString());
        await setDoc(ref, payload);
        await db.logs.update(log.id!, { syncStatus: 'synced' });
      });
    }

    // Execute in chunks
    for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
      await Promise.all(allWrites.slice(i, i + BATCH_SIZE).map((fn) => fn()));
    }

    // Flush pendingWrites queue too
    await flushPendingQueue(USER_ID);

    console.log(`✅ Synced ${pendingHabits.length} habits, ${pendingLogs.length} logs`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('No authenticated user')) return;
    console.error('❌ Sync failed:', error);
  }
};

// ─────────────────────────────────────────────
// Flush the pendingWrites queue (generic writes)
// ─────────────────────────────────────────────

async function flushPendingQueue(userId: string): Promise<void> {
  const items = await db.pendingWrites.toArray();
  if (items.length === 0) return;
  for (const item of items) {
    try {
      const ref = doc(firestore, 'users', userId, item.collection, item.docId);
      await setDoc(ref, JSON.parse(item.data), { merge: true });
      await db.pendingWrites.delete(item.id!);
    } catch (e) {
      console.warn('Failed to flush pending write:', e);
    }
  }
}

// ─────────────────────────────────────────────
// Enqueue a write for offline support
// ─────────────────────────────────────────────

export const enqueueWrite = async (
  collection: string,
  docId: string,
  data: object,
): Promise<void> => {
  await db.pendingWrites.add({
    collection,
    docId,
    data: JSON.stringify(data),
    createdAt: Date.now(),
  });
};

// ─────────────────────────────────────────────
// Sync profile (friend code, E2EE settings, stats opt-in)
// ─────────────────────────────────────────────

export const syncProfile = async (profileData: object): Promise<void> => {
  const { isOnline } = useStore.getState();
  try {
    const userId = getUserId();
    const ref = doc(firestore, 'users', userId);
    if (isOnline) {
      await setDoc(ref, profileData, { merge: true });
    } else {
      await enqueueWrite('_root', userId, profileData);
    }
  } catch (e) {
    console.error('Profile sync failed:', e);
  }
};

// ─────────────────────────────────────────────
// Fetch friend stats (weekly completion %)
// ─────────────────────────────────────────────

export const getFriendWeeklyStats = async (
  friendUid: string,
): Promise<{ weeklyPct: number; totalCompletions: number } | null> => {
  try {
    const ref = doc(firestore, 'users', friendUid, 'public_stats', 'weekly');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as { weeklyPct: number; totalCompletions: number };
    }
    return null;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// Push our own public stats to Firestore (if opted in)
// ─────────────────────────────────────────────

export const publishPublicStats = async (
  weeklyPct: number,
  totalCompletions: number,
): Promise<void> => {
  try {
    const userId = getUserId();
    const ref = doc(firestore, 'users', userId, 'public_stats', 'weekly');
    await setDoc(ref, {
      weeklyPct: Math.round(weeklyPct),
      totalCompletions,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to publish public stats:', e);
  }
};

// ─────────────────────────────────────────────
// Friend request management via Firestore
// ─────────────────────────────────────────────

export const sendFriendRequest = async (
  toUid: string,
  toDisplayName: string,
  myCode: string,
  myDisplayName: string,
): Promise<void> => {
  const userId = getUserId();
  const reqId = `${userId}_${toUid}`;
  const ref = doc(firestore, 'friend_requests', reqId);
  await setDoc(ref, {
    fromUid: userId,
    fromDisplayName: myDisplayName,
    fromCode: myCode,
    toUid,
    toDisplayName,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
};

export const acceptFriendRequest = async (reqId: string): Promise<void> => {
  const ref = doc(firestore, 'friend_requests', reqId);
  await setDoc(ref, { status: 'accepted' }, { merge: true });
};

export const declineFriendRequest = async (reqId: string): Promise<void> => {
  const ref = doc(firestore, 'friend_requests', reqId);
  await setDoc(ref, { status: 'declined' }, { merge: true });
};

// ─────────────────────────────────────────────
// Storage quota check
// ─────────────────────────────────────────────

export const checkStorageQuota = async (): Promise<{
  usedMB: number;
  exceeded: boolean;
}> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage = 0 } = await navigator.storage.estimate();
    const usedMB = usage / 1024 / 1024;
    return { usedMB: Math.round(usedMB * 10) / 10, exceeded: usedMB > 50 };
  }
  return { usedMB: 0, exceeded: false };
};