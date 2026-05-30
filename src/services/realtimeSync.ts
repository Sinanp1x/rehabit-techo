// src/services/realtimeSync.ts — Firestore realtime listeners + month cache bridge
import { collection, onSnapshot, query, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { format, startOfMonth } from 'date-fns';
import { auth, firestore } from '../firebase';
import { db, type Habit, type HabitLog } from '../db';
import { useStore } from '../store/useStore';

const CACHE_PREFIX = 'rehabit:month-cache:v1';

type RemoteHabitRecord = Habit & { id: number; updatedAt: number };
type RemoteLogRecord = HabitLog & { id: number; updatedAt: number };

type DecodedPayload = Record<string, unknown>;

let unsubscribeHabits: (() => void) | null = null;
let unsubscribeLogs: (() => void) | null = null;
let latestRemoteHabits: RemoteHabitRecord[] = [];
let latestRemoteLogs: RemoteLogRecord[] = [];
let receivedHabitsSnapshot = false;
let receivedLogsSnapshot = false;
// Mutex: prevents concurrent reconcileSnapshots Dexie transactions
let isReconciling = false;
let pendingReconcile = false;

function getUserId(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
}

function getCurrentMonthStart(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

function getCacheKey(userId: string): string {
  return `${CACHE_PREFIX}:${userId}:${getCurrentMonthStart().slice(0, 7)}`;
}

function normalizeTimestamp(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return fallback;
}

async function decodePayload(snapshot: QueryDocumentSnapshot): Promise<DecodedPayload> {
  const data = snapshot.data() as DecodedPayload;
  if (!data._encrypted) return data;

  const { e2ee } = useStore.getState();
  if (!e2ee.enabled || !e2ee.key) {
    return data;
  }

  const { decryptData } = await import('./crypto');
  const plaintext = await decryptData(e2ee.key, {
    ciphertext: String(data.ciphertext ?? ''),
    iv: String(data.iv ?? ''),
  });

  return JSON.parse(plaintext) as DecodedPayload;
}

function cacheCurrentMonth(userId: string, habits: Habit[], logs: HabitLog[]): void {
  const monthStart = getCurrentMonthStart();
  const monthLogs = logs.filter((log) => log.date >= monthStart);
  localStorage.setItem(
    getCacheKey(userId),
    JSON.stringify({
      updatedAt: Date.now(),
      monthStart,
      habits,
      logs: monthLogs,
    }),
  );
}

async function seedFromCache(userId: string): Promise<void> {
  const cached = localStorage.getItem(getCacheKey(userId));
  if (!cached) return;

  try {
    const parsed = JSON.parse(cached) as { habits?: Habit[]; logs?: HabitLog[] };
    if (Array.isArray(parsed.habits) && parsed.habits.length > 0) {
      await db.habits.bulkPut(parsed.habits.filter((habit): habit is Habit => Boolean(habit && habit.id)));
    }
    if (Array.isArray(parsed.logs) && parsed.logs.length > 0) {
      await db.logs.bulkPut(parsed.logs.filter((log): log is HabitLog => Boolean(log && log.id)));
    }
  } catch {
    localStorage.removeItem(getCacheKey(userId));
  }
}

function isNewerLocalRecord(localUpdatedAt: number | undefined, remoteUpdatedAt: number): boolean {
  return (localUpdatedAt ?? 0) > remoteUpdatedAt;
}

async function reconcileSnapshots(): Promise<void> {
  const userId = getUserId();
  const currentMonthStart = getCurrentMonthStart();

  const [pendingHabits, pendingLogs, localHabits, localLogs] = await Promise.all([
    db.habits.where('syncStatus').equals('pending').and((habit) => habit.userId === userId).toArray(),
    db.logs.where('syncStatus').equals('pending').and((log) => log.userId === userId && log.date >= currentMonthStart).toArray(),
    db.habits.where('userId').equals(userId).toArray(),
    db.logs.where('userId').equals(userId).and((log) => log.date >= currentMonthStart).toArray(),
  ]);

  const pendingHabitById = new Map(pendingHabits.map((habit) => [habit.id!, habit]));
  const pendingLogById = new Map(pendingLogs.map((log) => [log.id!, log]));
  const pendingLogByKey = new Map(pendingLogs.map((log) => [`${log.habitId}:${log.date}`, log]));

  const remoteHabitIds = new Set<number>();
  const remoteLogIds = new Set<number>();
  const remoteLogKeys = new Set<string>();

  const habitsToUpsert: Habit[] = [];
  const logsToUpsert: HabitLog[] = [];

  for (const habit of latestRemoteHabits) {
    remoteHabitIds.add(habit.id);
    const localPending = pendingHabitById.get(habit.id);
    if (localPending && isNewerLocalRecord(localPending.updatedAt, habit.updatedAt)) {
      continue;
    }
    habitsToUpsert.push(habit);
  }

  for (const log of latestRemoteLogs) {
    remoteLogIds.add(log.id);
    remoteLogKeys.add(`${log.habitId}:${log.date}`);
    const localPending = pendingLogById.get(log.id) ?? pendingLogByKey.get(`${log.habitId}:${log.date}`);
    if (localPending && isNewerLocalRecord(localPending.updatedAt, log.updatedAt)) {
      continue;
    }
    logsToUpsert.push(log);
  }

  const staleHabitIds = localHabits
    .filter((habit) => habit.syncStatus === 'synced' && habit.id && !remoteHabitIds.has(habit.id))
    .map((habit) => habit.id!)
    .filter((id): id is number => typeof id === 'number');

  const staleLogIds = localLogs
    .filter((log) => log.syncStatus === 'synced' && log.id && !remoteLogIds.has(log.id) && !remoteLogKeys.has(`${log.habitId}:${log.date}`))
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

  cacheCurrentMonth(userId, await db.habits.where('userId').equals(userId).toArray(), await db.logs.where('userId').equals(userId).and((log) => log.date >= currentMonthStart).toArray());

  useStore.getState().setRealtimeStatus({
    realtimeLoading: false,
    realtimeReady: true,
    realtimeError: null,
    lastRealtimeSyncAt: Date.now(),
  });
}

function handleSnapshotError(error: unknown): void {
  console.error('Realtime sync failed:', error);
  useStore.getState().setRealtimeStatus({
    realtimeLoading: false,
    realtimeReady: false,
    realtimeError: error instanceof Error ? error.message : 'Realtime sync failed',
  });
}

// Serialized reconcile — queues a second pass instead of running two concurrent Dexie transactions
async function safeReconcile(): Promise<void> {
  if (isReconciling) {
    pendingReconcile = true;
    return;
  }
  isReconciling = true;
  try {
    await reconcileSnapshots();
    if (pendingReconcile) {
      pendingReconcile = false;
      await reconcileSnapshots();
    }
  } finally {
    isReconciling = false;
  }
}

export async function startRealtimeSync(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  stopRealtimeSync();
  useStore.getState().setRealtimeStatus({
    realtimeLoading: true,
    realtimeReady: false,
    realtimeError: null,
  });

  await seedFromCache(user.uid);

  const habitsQuery = query(collection(firestore, 'users', user.uid, 'habits'));
  const logsQuery = query(collection(firestore, 'users', user.uid, 'logs'), where('date', '>=', getCurrentMonthStart()));

  unsubscribeHabits = onSnapshot(
    habitsQuery,
    async (snapshot) => {
      try {
        latestRemoteHabits = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const id = Number(docSnapshot.id);
          if (Number.isNaN(id)) return null;
          const data = await decodePayload(docSnapshot);
          return {
            ...(data as Omit<Habit, 'id' | 'syncStatus' | 'userId'>),
            id,
            userId: user.uid,
            syncStatus: 'synced' as const,
            updatedAt: normalizeTimestamp(data.updatedAt, normalizeTimestamp(data.createdAt, Date.now())),
          } as RemoteHabitRecord;
        })).then((records) => records.filter((record): record is RemoteHabitRecord => record !== null));
        receivedHabitsSnapshot = true;
        if (receivedLogsSnapshot) {
          await safeReconcile();
        }
      } catch (error) {
        handleSnapshotError(error);
      }
    },
    handleSnapshotError,
  );

  unsubscribeLogs = onSnapshot(
    logsQuery,
    async (snapshot) => {
      try {
        latestRemoteLogs = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const id = Number(docSnapshot.id);
          if (Number.isNaN(id)) return null;
          const data = await decodePayload(docSnapshot);
          return {
            ...(data as Omit<HabitLog, 'id' | 'syncStatus' | 'userId'>),
            id,
            userId: user.uid,
            syncStatus: 'synced' as const,
            updatedAt: normalizeTimestamp(data.updatedAt, Date.now()),
          } as RemoteLogRecord;
        })).then((records) => records.filter((record): record is RemoteLogRecord => record !== null));
        receivedLogsSnapshot = true;
        if (receivedHabitsSnapshot) {
          await safeReconcile();
        }
      } catch (error) {
        handleSnapshotError(error);
      }
    },
    handleSnapshotError,
  );
}

export function stopRealtimeSync(): void {
  unsubscribeHabits?.();
  unsubscribeLogs?.();
  unsubscribeHabits = null;
  unsubscribeLogs = null;
  latestRemoteHabits = [];
  latestRemoteLogs = [];
  receivedHabitsSnapshot = false;
  receivedLogsSnapshot = false;
  isReconciling = false;
  pendingReconcile = false;
  useStore.getState().setRealtimeStatus({
    realtimeLoading: false,
    realtimeReady: false,
    realtimeError: null,
    lastRealtimeSyncAt: null,
  });
}
