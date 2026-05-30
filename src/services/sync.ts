// src/services/sync.ts — E2EE-aware Firestore sync with offline queue
import { db, type Habit, type HabitLog } from '../db';
import { firestore, auth } from '../firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  getDoc,
  where,
} from 'firebase/firestore';
import { format, startOfMonth, subMonths } from 'date-fns';
import { useStore } from '../store/useStore';
import { decryptData, encryptData } from './crypto';

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

async function decodePayload(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (data._encrypted) {
    const { e2ee } = useStore.getState();
    if (!e2ee.enabled || !e2ee.key) {
      throw new Error('Encrypted data requires an unlocked E2EE key');
    }

    const plaintext = await decryptData(e2ee.key, {
      ciphertext: String(data.ciphertext ?? ''),
      iv: String(data.iv ?? ''),
    });
    return JSON.parse(plaintext) as Record<string, unknown>;
  }

  return data;
}

type RemoteHabitRecord = Habit & { id: number };
type RemoteLogRecord = HabitLog & { id: number };

export interface StatsHistorySnapshot {
  habits: Habit[];
  logs: HabitLog[];
  rangeStart: string;
  rangeEnd: string;
}

function getCurrentMonthStart(): Date {
  return startOfMonth(new Date());
}

function getRollingWindowStart(): Date {
  return startOfMonth(subMonths(new Date(), 11));
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

async function pruneLocalLogsBefore(userId: string, cutoffDate: string): Promise<number> {
  const staleLogs = await db.logs
    .where('userId')
    .equals(userId)
    .filter((log) => log.date < cutoffDate)
    .toArray();

  if (staleLogs.length === 0) return 0;

  await db.logs.bulkDelete(
    staleLogs
      .map((log) => log.id)
      .filter((id): id is number => typeof id === 'number'),
  );

  return staleLogs.length;
}

async function pruneRemoteLogsBefore(userId: string, cutoffDate: string): Promise<number> {
  const logQuery = query(
    collection(firestore, 'users', userId, 'logs'),
    where('date', '<', cutoffDate),
  );
  const staleSnap = await getDocs(logQuery);
  await Promise.all(staleSnap.docs.map((snapshot) => deleteDoc(snapshot.ref)));
  return staleSnap.size;
}

async function enforceDataRetention(userId: string): Promise<void> {
  const currentMonthStart = toDateString(getCurrentMonthStart());
  const rollingWindowStart = toDateString(getRollingWindowStart());
  await pruneLocalLogsBefore(userId, currentMonthStart);

  if (useStore.getState().isOnline) {
    await pruneRemoteLogsBefore(userId, rollingWindowStart);
  }
}

// ─────────────────────────────────────────────
// Main sync function
// ─────────────────────────────────────────────

export const syncData = async (): Promise<boolean | 'skipped'> => {
  const { isOnline, batteryMode } = useStore.getState();
  if (!isOnline) return false;

  // In battery mode, skip sync unless queue is large — return 'skipped', NOT false
  // so callers don't treat this as a hard failure and roll back local changes
  const pendingCount = await db.pendingWrites.count();
  if (batteryMode && pendingCount < 5) return 'skipped';

  try {
    const USER_ID = getUserId();

    const pendingHabits = await db.habits.where('syncStatus').equals('pending').toArray();
    const pendingLogs = await db.logs.where('syncStatus').equals('pending').toArray();

    if (pendingHabits.length === 0 && pendingLogs.length === 0) return true;

    // Batch writes (Firestore limit: 500 per batch)
    const BATCH_SIZE = 400;
    const allWrites: (() => Promise<void>)[] = [];

    for (const habit of pendingHabits) {
      allWrites.push(async () => {
        const payload = await preparePayload({ ...habit, syncStatus: 'synced', updatedAt: habit.updatedAt ?? Date.now() });
        const ref = doc(firestore, 'users', USER_ID, 'habits', habit.id!.toString());
        await setDoc(ref, payload);
        await db.habits.update(habit.id!, { syncStatus: 'synced' });
      });
    }

    for (const log of pendingLogs) {
      allWrites.push(async () => {
        const payload = await preparePayload({ ...log, syncStatus: 'synced', updatedAt: log.updatedAt ?? Date.now() });
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
    await enforceDataRetention(USER_ID);

    console.log(`✅ Synced ${pendingHabits.length} habits, ${pendingLogs.length} logs`);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('No authenticated user')) return false;
    console.error('❌ Sync failed:', error);
    return false;
  }
};

// ─────────────────────────────────────────────
// Pull remote data into Dexie on login/unlock
// ─────────────────────────────────────────────

export const hydrateRemoteData = async (): Promise<{ habits: number; logs: number }> => {
  try {
    const userId = getUserId();
    const currentMonthStart = toDateString(getCurrentMonthStart());
    await pruneLocalLogsBefore(userId, currentMonthStart);

    const { isOnline } = useStore.getState();
    if (!isOnline) return { habits: 0, logs: 0 };

    const [habitSnap, logSnap] = await Promise.all([
      getDocs(collection(firestore, 'users', userId, 'habits')),
      getDocs(
        query(
          collection(firestore, 'users', userId, 'logs'),
          // Seed full 12-month rolling window so historical charts render on first load
          where('date', '>=', toDateString(getRollingWindowStart())),
        ),
      ),
    ]);

    const remoteHabits = await Promise.all(
      habitSnap.docs.map(async (snapshot) => {
        const decoded = await decodePayload(snapshot.data() as Record<string, unknown>);
        const id = Number(snapshot.id);
        if (Number.isNaN(id)) return null;
        return {
          ...decoded,
          id,
          userId,
          syncStatus: 'synced' as const,
        } as RemoteHabitRecord;
      }),
    );

    const remoteLogs = await Promise.all(
      logSnap.docs.map(async (snapshot) => {
        const decoded = await decodePayload(snapshot.data() as Record<string, unknown>);
        const id = Number(snapshot.id);
        if (Number.isNaN(id)) return null;
        return {
          ...decoded,
          id,
          userId,
          syncStatus: 'synced' as const,
        } as RemoteLogRecord;
      }),
    );

    const habitsToSave = remoteHabits.filter((habit): habit is RemoteHabitRecord => habit !== null);
    const logsToSave = remoteLogs.filter((log): log is RemoteLogRecord => log !== null);

    const [localPendingHabits, localPendingLogs, localHabits, localLogs] = await Promise.all([
      db.habits.where('syncStatus').equals('pending').and((habit) => habit.userId === userId).toArray(),
      db.logs.where('syncStatus').equals('pending').and((log) => log.userId === userId).toArray(),
      db.habits.where('userId').equals(userId).toArray(),
      db.logs.where('userId').equals(userId).toArray(),
    ]);

    const pendingHabitIds = new Set(
      localPendingHabits.map((habit) => habit.id).filter((id): id is number => typeof id === 'number'),
    );
    const pendingLogIds = new Set(
      localPendingLogs.map((log) => log.id).filter((id): id is number => typeof id === 'number'),
    );
    const pendingLogKeys = new Set(localPendingLogs.map((log) => `${log.habitId}:${log.date}`));

    const remoteHabitIds = new Set<number>();
    const remoteLogIds = new Set<number>();
    const remoteLogKeys = new Set<string>();

    const habitsToUpsert = habitsToSave.filter((habit) => {
      remoteHabitIds.add(habit.id!);
      return !pendingHabitIds.has(habit.id!);
    });

    const logsToUpsert = logsToSave.filter((log) => {
      remoteLogIds.add(log.id!);
      remoteLogKeys.add(`${log.habitId}:${log.date}`);
      return !pendingLogIds.has(log.id!) && !pendingLogKeys.has(`${log.habitId}:${log.date}`);
    });

    const staleHabitIds = localHabits
      .filter((habit) => habit.syncStatus === 'synced' && !remoteHabitIds.has(habit.id!))
      .map((habit) => habit.id!)
      .filter((id): id is number => typeof id === 'number');

    const staleLogIds = localLogs
      .filter(
        (log) =>
          log.syncStatus === 'synced' &&
          !remoteLogIds.has(log.id!) &&
          !remoteLogKeys.has(`${log.habitId}:${log.date}`),
      )
      .map((log) => log.id!)
      .filter((id): id is number => typeof id === 'number');

    await db.transaction('rw', db.habits, db.logs, async () => {
      if (staleHabitIds.length > 0) {
        await db.habits.bulkDelete(staleHabitIds);
      }

      if (staleLogIds.length > 0) {
        await db.logs.bulkDelete(staleLogIds);
      }

      if (habitsToUpsert.length > 0) {
        await db.habits.bulkPut(habitsToUpsert);
      }

      if (logsToUpsert.length > 0) {
        await db.logs.bulkPut(logsToUpsert);
      }
    });

    console.log(`✅ Hydrated ${habitsToUpsert.length} habits and ${logsToUpsert.length} logs from Firestore`);
    await enforceDataRetention(userId);
    return { habits: habitsToUpsert.length, logs: logsToUpsert.length };
  } catch (error) {
    if (error instanceof Error && error.message.includes('No authenticated user')) {
      return { habits: 0, logs: 0 };
    }
    console.error('❌ Remote hydration failed:', error);
    return { habits: 0, logs: 0 };
  }
};

export const fetchRollingStatsHistory = async (): Promise<StatsHistorySnapshot> => {
  const userId = getUserId();
  const rangeStart = toDateString(getRollingWindowStart());
  const rangeEnd = toDateString(new Date());

  const [habitSnap, logSnap] = await Promise.all([
    getDocs(collection(firestore, 'users', userId, 'habits')),
    getDocs(
      query(
        collection(firestore, 'users', userId, 'logs'),
        where('date', '>=', rangeStart),
        where('date', '<=', rangeEnd),
      ),
    ),
  ]);

  const habits = await Promise.all(
    habitSnap.docs.map(async (snapshot) => {
      const decoded = await decodePayload(snapshot.data() as Record<string, unknown>);
      const id = Number(snapshot.id);
      if (Number.isNaN(id)) return null;
      return {
        ...decoded,
        id,
        userId,
        syncStatus: 'synced' as const,
      } as RemoteHabitRecord;
    }),
  ).then((records) => records.filter((record): record is RemoteHabitRecord => record !== null));

  const logs = await Promise.all(
    logSnap.docs.map(async (snapshot) => {
      const decoded = await decodePayload(snapshot.data() as Record<string, unknown>);
      const id = Number(snapshot.id);
      if (Number.isNaN(id)) return null;
      return {
        ...decoded,
        id,
        userId,
        syncStatus: 'synced' as const,
      } as RemoteLogRecord;
    }),
  ).then((records) => records.filter((record): record is RemoteLogRecord => record !== null));

  return { habits, logs, rangeStart, rangeEnd };
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