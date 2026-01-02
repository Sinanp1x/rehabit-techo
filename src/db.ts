// src/db.ts
import Dexie, { type Table } from 'dexie';

export interface Habit {
  id?: number;
  userId: string;             // Firebase user ID for security
  title: string;
  category: string;
  color: string;
  
  // New Controls
  type: 'habit' | 'reminder'; // Is it for stats or just a task?
  hasTime: boolean;           // If false, it's an "All Day" task
  time: string;               // "09:00" (Ignored if hasTime is false)
  endDate: string | null;     // "2024-12-31" (If null, repeats forever)
  
  frequencyDays: number[];
  archived: boolean;
  syncStatus: 'pending' | 'synced'; 
}

export interface HabitLog {
  id?: number;
  userId: string;             // Firebase user ID for security
  habitId: number;
  date: string;
  status: 'done';
  syncStatus: 'pending' | 'synced';
}

class HabitDatabase extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;

  constructor() {
    super('HabitTrackerDB_v4'); // <--- Bumped to v4 for userId
    this.version(1).stores({
      habits: '++id, userId, title, category, type, archived, syncStatus',
      logs: '++id, userId, habitId, date, [habitId+date], [userId+date], syncStatus'
    });
  }
}

export const db = new HabitDatabase();