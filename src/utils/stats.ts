// src/utils/stats.ts — Streak and completion calculations
import { format, subDays, getDay } from 'date-fns';
import type { Habit, HabitLog } from '../db';

// ─────────────────────────────────────────────
// Current streak for a habit
// ─────────────────────────────────────────────

export function getCurrentStreak(habitId: number, logs: HabitLog[], habit: Habit): number {
  const validStatuses: HabitLog['status'][] = ['done', 'partial'];
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    const dayIndex = getDay(d);
    const dateStr = format(d, 'yyyy-MM-dd');

    // Check if this day is scheduled for this habit
    const isScheduled = habit.frequencyDays.includes(dayIndex);
    if (!isScheduled) continue;

    // Check if logged (done or partial — skip doesn't break streak)
    const log = logs.find(
      (l) => l.habitId === habitId && l.date === dateStr,
    );

    if (log && validStatuses.includes(log.status)) {
      streak++;
    } else if (log && log.status === 'skip') {
      // Skip doesn't break streak, but doesn't count either
      continue;
    } else if (!log && i === 0) {
      // Today not yet logged — don't break streak for today
      continue;
    } else {
      break;
    }
  }

  return streak;
}

// ─────────────────────────────────────────────
// Longest streak ever for a habit
// ─────────────────────────────────────────────

export function getLongestStreak(habitId: number, logs: HabitLog[], habit: Habit): number {
  const validStatuses: HabitLog['status'][] = ['done', 'partial'];
  const sortedDates = logs
    .filter((l) => l.habitId === habitId && validStatuses.includes(l.status))
    .map((l) => l.date)
    .sort();

  if (sortedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    // Account for non-scheduled days in between
    if (diff <= 2) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// ─────────────────────────────────────────────
// Weekly completion percentage
// ─────────────────────────────────────────────

export function getWeeklyCompletionPct(habits: Habit[], logs: HabitLog[]): number {
  const today = new Date();
  let scheduled = 0;
  let completed = 0;

  for (let i = 0; i < 7; i++) {
    const d = subDays(today, i);
    const dayIndex = getDay(d);
    const dateStr = format(d, 'yyyy-MM-dd');

    for (const habit of habits.filter((h) => h.type === 'habit' && !h.archived)) {
      if (!habit.frequencyDays.includes(dayIndex)) continue;
      scheduled++;
      const log = logs.find((l) => l.habitId === habit.id && l.date === dateStr);
      if (log && (log.status === 'done' || log.status === 'partial')) completed++;
    }
  }

  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
}

// ─────────────────────────────────────────────
// Monthly completion percentage (for timeline)
// ─────────────────────────────────────────────

export function getMonthlyCompletionPcts(
  habits: Habit[],
  logs: HabitLog[],
  monthsBack = 6,
): { month: string; pct: number }[] {
  const result: { month: string; pct: number }[] = [];
  const today = new Date();

  for (let m = monthsBack - 1; m >= 0; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const monthStr = format(d, 'MMM yyyy');
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    let scheduled = 0;
    let completed = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(d.getFullYear(), d.getMonth(), day);
      if (date > today) break;
      const dayIndex = getDay(date);
      const dateStr = format(date, 'yyyy-MM-dd');

      for (const habit of habits.filter((h) => h.type === 'habit' && !h.archived)) {
        if (!habit.frequencyDays.includes(dayIndex)) continue;
        scheduled++;
        const log = logs.find((l) => l.habitId === habit.id && l.date === dateStr);
        if (log && (log.status === 'done' || log.status === 'partial')) completed++;
      }
    }

    result.push({ month: monthStr, pct: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100) });
  }

  return result;
}