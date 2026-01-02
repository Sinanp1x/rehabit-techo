// src/db.ts
import Dexie, { type Table } from 'dexie';

export interface Habit {
  id?: number;
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
  habitId: number;
  date: string;
  status: 'done';
  syncStatus: 'pending' | 'synced';
}

class HabitDatabase extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;

  constructor() {
    super('HabitTrackerDB_v3'); // <--- Bumped to v3
    this.version(1).stores({
      habits: '++id, title, category, type, archived, syncStatus',
      logs: '++id, habitId, date, [habitId+date], syncStatus'
    });
  }
}

export const db = new HabitDatabase();