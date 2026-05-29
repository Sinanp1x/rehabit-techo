// src/db.ts — Rehabit Echo v5 Schema
import Dexie, { type Table } from 'dexie';

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface Habit {
  id?: number;
  userId: string;
  title: string;
  tags: string[];           // Multi-tag (Health, Study, Spiritual, Family, Personal, custom)
  color: string;
  type: 'habit' | 'reminder';
  hasTime: boolean;
  time: string;             // Primary reminder "HH:mm"
  reminders: string[];      // Additional reminder times ["HH:mm", ...]
  notificationsEnabled: boolean;
  endDate: string | null;
  frequencyDays: number[];  // 0=Sun … 6=Sat
  quantity: string | null;  // e.g. "30 min", "8 glasses"
  archived: boolean;
  syncStatus: 'pending' | 'synced';
  createdAt: string;        // ISO date
}

export type LogStatus = 'done' | 'partial' | 'skip';

export interface HabitLog {
  id?: number;
  userId: string;
  habitId: number;
  date: string;             // "yyyy-MM-dd"
  status: LogStatus;
  skipReason: string | null; // 'sick' | 'vacation' | 'other' | null
  partialValue: number | null; // 0–100 percentage OR raw quantity
  syncStatus: 'pending' | 'synced';
}

export interface PendingWrite {
  id?: number;
  collection: string;       // 'habits' | 'logs' | 'profile'
  docId: string;
  data: string;             // JSON-stringified payload (may be encrypted)
  createdAt: number;        // timestamp ms
}

export interface FriendRequest {
  id?: number;
  userId: string;           // current user
  direction: 'incoming' | 'outgoing';
  friendCode: string;
  friendUid: string;
  displayName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Friend {
  id?: number;
  userId: string;
  friendUid: string;
  displayName: string;
  friendCode: string;
  shareStats: boolean;      // did this friend opt in to sharing their stats?
  connectedAt: string;
}

export interface ScheduledReminder {
  id?: number;
  habitId: number;
  habitTitle: string;
  time: string;             // "HH:mm"
  nextFire: number;         // timestamp ms
}

export interface UserProfile {
  id?: number;
  userId: string;
  displayName: string;
  friendCode: string;
  shareStatsWithFriends: boolean;
  e2eeEnabled: boolean;
  e2eeSalt: string | null;  // base64 salt stored locally
  dndStart: string | null;  // "HH:mm" do-not-disturb start
  dndEnd: string | null;    // "HH:mm" do-not-disturb end
  batteryMode: boolean;
}

// ─────────────────────────────────────────────
// Database Class
// ─────────────────────────────────────────────

class HabitDatabase extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;
  pendingWrites!: Table<PendingWrite>;
  friendRequests!: Table<FriendRequest>;
  friends!: Table<Friend>;
  scheduledReminders!: Table<ScheduledReminder>;
  profile!: Table<UserProfile>;

  constructor() {
    super('RehabitEchoDB_v5');

    // Version 1 — fresh v5 schema
    this.version(1).stores({
      habits: '++id, userId, type, archived, syncStatus, createdAt',
      logs: '++id, userId, habitId, date, [habitId+date], [userId+date], status, syncStatus',
      pendingWrites: '++id, collection, docId, createdAt',
      friendRequests: '++id, userId, direction, status, friendUid',
      friends: '++id, userId, friendUid',
      scheduledReminders: '++id, habitId, nextFire',
      profile: '++id, userId',
    });
  }
}

export const db = new HabitDatabase();