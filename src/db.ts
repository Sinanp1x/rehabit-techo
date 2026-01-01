// src/db.ts
import Dexie, { type Table } from 'dexie';

export interface Habit {
  id?: number;
  title: string;
  category: 'Health' | 'Study' | 'Spiritual' | 'Family' | 'Personal';
  
  // New Fields for Habit Control
  targetValue: number; // e.g., 1 (for checkbox) or 20 (for pages)
  unit: string;        // e.g., "times", "pages", "mins"
  frequencyDays: number[]; // Array of days [0, 1, 2...] (0 = Sunday)
  
  archived: boolean;
  syncStatus: 'pending' | 'synced'; 
}

export interface HabitLog {
  id?: number;
  habitId: number;
  date: string;
  status: 'done' | 'partial' | 'skipped';
  value: number; // How much was actually done?
  note?: string;
  syncStatus: 'pending' | 'synced';
}

class HabitDatabase extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;

  constructor() {
    super('HabitTrackerDB');
    this.version(1).stores({
      habits: '++id, title, category, archived, syncStatus',
      logs: '++id, habitId, date, status, [habitId+date], syncStatus'
    });
  }
}

export const db = new HabitDatabase();