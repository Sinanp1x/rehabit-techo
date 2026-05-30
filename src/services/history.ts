// src/services/history.ts — Rolling history helpers for local-first stats
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { format, startOfMonth, subMonths } from 'date-fns';
import { auth, firestore } from '../firebase';
import { db, type HabitLog } from '../db';
import { useStore } from '../store/useStore';
import { decryptData } from './crypto';

export const ROLLING_HISTORY_MONTHS = 12;
type RemoteLogRecord = HabitLog & { id: number };

function getCurrentUserId(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
}

export function getCurrentMonthStartDate(referenceDate = new Date()): string {
  return format(startOfMonth(referenceDate), 'yyyy-MM-dd');
}

export function getRollingHistoryStartDate(referenceDate = new Date()): string {
  return format(startOfMonth(subMonths(referenceDate, ROLLING_HISTORY_MONTHS - 1)), 'yyyy-MM-dd');
}

async function decodeRemotePayload(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!data._encrypted) return data;

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

export function mergeLogsForStats(localLogs: HabitLog[], remoteLogs: HabitLog[]): HabitLog[] {
  const merged = new Map<string, HabitLog>();

  const keyFor = (log: HabitLog) => (typeof log.id === 'number' ? `id:${log.id}` : `log:${log.habitId}:${log.date}`);

  for (const log of remoteLogs) {
    merged.set(keyFor(log), log);
  }

  for (const log of localLogs) {
    const key = keyFor(log);
    const existing = merged.get(key);
    if (!existing || log.syncStatus === 'pending' || existing.syncStatus !== 'pending') {
      merged.set(key, log);
    }
  }

  return Array.from(merged.values());
}

export async function fetchRemoteLogsInRange(
  startDate: string,
  endDate = format(new Date(), 'yyyy-MM-dd'),
): Promise<HabitLog[]> {
  const userId = getCurrentUserId();
  const snap = await getDocs(
    query(
      collection(firestore, 'users', userId, 'logs'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    ),
  );

  const logs = await Promise.all(
    snap.docs.map(async (snapshot) => {
      const id = Number(snapshot.id);
      if (Number.isNaN(id)) return null;

      const decoded = await decodeRemotePayload(snapshot.data() as Record<string, unknown>);
      return {
        ...(decoded as Omit<HabitLog, 'id' | 'syncStatus' | 'userId'>),
        id,
        userId,
        syncStatus: 'synced' as const,
      } as RemoteLogRecord;
    }),
  );

  return logs.filter((log): log is RemoteLogRecord => log !== null);
}

export async function fetchRemoteCurrentMonthLogs(): Promise<HabitLog[]> {
  return fetchRemoteLogsInRange(getCurrentMonthStartDate());
}

export async function pruneLocalLogsBeforeCurrentMonth(userId: string = getCurrentUserId()): Promise<number> {
  const cutoff = getCurrentMonthStartDate();
  const staleLogs = await db.logs.where('userId').equals(userId).and((log) => log.date < cutoff).toArray();

  if (staleLogs.length === 0) return 0;

  await db.logs.bulkDelete(
    staleLogs.map((log) => log.id).filter((id): id is number => typeof id === 'number'),
  );

  return staleLogs.length;
}

export async function pruneRemoteLogsBeforeRollingWindow(userId: string = getCurrentUserId()): Promise<number> {
  const cutoff = getRollingHistoryStartDate();
  const snap = await getDocs(
    query(collection(firestore, 'users', userId, 'logs'), where('date', '<', cutoff)),
  );

  if (snap.empty) return 0;

  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(firestore);
    const chunk = snap.docs.slice(i, i + 400);
    for (const snapshot of chunk) {
      batch.delete(snapshot.ref);
    }
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}