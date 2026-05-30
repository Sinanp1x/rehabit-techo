// src/utils/stats.ts — Streak and completion calculations
import { eachDayOfInterval, format, getDay, subDays } from 'date-fns';
import type { Habit, HabitLog } from '../db';

const PRIORITY_TAGS = new Set(['priority', 'high priority', 'non-negotiable', 'nonnegotiable', 'essential']);
const CORE_TAGS = new Set(['health', 'spiritual', 'fitness', 'wellness', 'growth']);

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function completionValue(log: HabitLog | undefined): number {
  if (!log) return 0;
  if (log.status === 'done') return 1;
  if (log.status === 'partial') {
    if (typeof log.partialValue === 'number' && Number.isFinite(log.partialValue)) {
      return Math.max(0, Math.min(1, log.partialValue / 100));
    }
    return 0.5;
  }
  return 0;
}

function isHabitActiveInWindow(habit: Habit, startDate: Date, endDate: Date): boolean {
  if (!habit.endDate) return true;
  const habitEnd = new Date(`${habit.endDate}T23:59:59`);
  return habitEnd >= startDate;
}

export function isHighPriorityHabit(habit: Habit): boolean {
  return habit.tags.some((tag) => PRIORITY_TAGS.has(normalizeTag(tag))) || habit.notificationsEnabled;
}

export function isCoreGrowthHabit(habit: Habit): boolean {
  return habit.tags.some((tag) => CORE_TAGS.has(normalizeTag(tag)));
}

export function getScheduledOccurrencesInRange(habit: Habit, startDate: Date, endDate: Date): number {
  const intervalEnd = habit.endDate ? new Date(`${habit.endDate}T23:59:59`) : endDate;
  const actualEnd = intervalEnd < endDate ? intervalEnd : endDate;
  if (actualEnd < startDate) return 0;

  return eachDayOfInterval({ start: startDate, end: actualEnd }).filter((day) => habit.frequencyDays.includes(getDay(day))).length;
}

export function getCompletedOccurrencesInRange(habit: Habit, logs: HabitLog[], startDate: Date, endDate: Date): number {
  return logs.filter((log) => {
    if (log.habitId !== habit.id) return false;
    const logDate = new Date(`${log.date}T00:00:00`);
    return logDate >= startDate && logDate <= endDate && completionValue(log) > 0;
  }).length;
}

export interface CategoryCompletionDatum {
  name: string;
  value: number;
  completionPct: number;
  completed: number;
  scheduled: number;
  color: string;
}

export function getCategoryCompletionData(habits: Habit[], logs: HabitLog[], startDate: Date, endDate: Date): CategoryCompletionDatum[] {
  const categoryMap = new Map<string, CategoryCompletionDatum>();

  for (const habit of habits.filter((item) => item.type === 'habit' && !item.archived && isHabitActiveInWindow(item, startDate, endDate))) {
    const scheduled = getScheduledOccurrencesInRange(habit, startDate, endDate);
    const completed = getCompletedOccurrencesInRange(habit, logs, startDate, endDate);
    if (scheduled === 0 && completed === 0) continue;

    const uniqueTags = Array.from(new Set(habit.tags.length > 0 ? habit.tags : ['General']));
    for (const tag of uniqueTags) {
      const existing = categoryMap.get(tag) ?? {
        name: tag,
        value: 0,
        completionPct: 0,
        completed: 0,
        scheduled: 0,
        color: habit.color,
      };

      existing.completed += completed;
      existing.scheduled += scheduled;
      existing.completionPct = existing.scheduled === 0 ? 0 : Math.round((existing.completed / existing.scheduled) * 100);
      existing.value = existing.completed;
      existing.color = existing.color || habit.color;
      categoryMap.set(tag, existing);
    }
  }

  return Array.from(categoryMap.values())
    .filter((item) => item.scheduled > 0 || item.completed > 0)
    .sort((a, b) => b.completionPct - a.completionPct);
}

export interface PersonalityRadarDatum {
  subject: string;
  A: number;
  fullMark: number;
}

export function getPersonalityRadarData(habits: Habit[], logs: HabitLog[], lookbackDays = 30): PersonalityRadarDatum[] {
  const today = new Date();
  const startDate = subDays(today, lookbackDays - 1);
  const activeHabits = habits.filter((habit) => habit.type === 'habit' && !habit.archived);

  const scheduledByHabit = new Map<number, number>();
  const completedByHabit = new Map<number, number>();

  for (const habit of activeHabits) {
    const scheduled = getScheduledOccurrencesInRange(habit, startDate, today);
    const completed = getCompletedOccurrencesInRange(habit, logs, startDate, today);
    scheduledByHabit.set(habit.id!, scheduled);
    completedByHabit.set(habit.id!, completed);
  }

  const disciplineScheduled = Array.from(scheduledByHabit.values()).reduce((sum, value) => sum + value, 0);
  const disciplineCompleted = Array.from(completedByHabit.values()).reduce((sum, value) => sum + value, 0);
  const scoreDiscipline = disciplineScheduled === 0 ? 0 : Math.round((disciplineCompleted / disciplineScheduled) * 100);

  const highPriorityHabits = activeHabits.filter((habit) => isHighPriorityHabit(habit));
  const responsibilityScheduled = highPriorityHabits.reduce(
    (sum, habit) => sum + (scheduledByHabit.get(habit.id!) ?? 0),
    0,
  );
  const responsibilityCompleted = highPriorityHabits.reduce(
    (sum, habit) => sum + (completedByHabit.get(habit.id!) ?? 0),
    0,
  );
  const scoreResponsibility = responsibilityScheduled === 0
    ? scoreDiscipline
    : Math.round((responsibilityCompleted / responsibilityScheduled) * 100);

  const devotionHabits = activeHabits.filter((habit) => isCoreGrowthHabit(habit));
  const devotionScheduled = devotionHabits.reduce((sum, habit) => sum + (scheduledByHabit.get(habit.id!) ?? 0), 0);
  const devotionCompleted = devotionHabits.reduce((sum, habit) => sum + (completedByHabit.get(habit.id!) ?? 0), 0);
  const scoreDevotion = devotionScheduled === 0 ? scoreDiscipline : Math.round((devotionCompleted / devotionScheduled) * 100);

  const completedDays = eachDayOfInterval({ start: startDate, end: today }).filter((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const scheduledHabits = activeHabits.filter((habit) => habit.frequencyDays.includes(getDay(day)) && (!habit.endDate || dateStr <= habit.endDate));
    if (scheduledHabits.length === 0) return false;
    return scheduledHabits.every((habit) => {
      const log = logs.find((entry) => entry.habitId === habit.id && entry.date === dateStr);
      return completionValue(log) > 0;
    });
  }).length;
  const scoreFocus = Math.round((completedDays / lookbackDays) * 100);

  const streakScores = activeHabits
    .map((habit) => {
      const scheduled = scheduledByHabit.get(habit.id!) ?? 0;
      if (scheduled === 0) return 0;
      const currentStreakDays = getCurrentStreak(habit.id!, logs, habit);
      return Math.min(100, Math.round((currentStreakDays / scheduled) * 100));
    })
    .filter((score) => score > 0);
  const scoreConsistency = streakScores.length === 0 ? 0 : Math.round(streakScores.reduce((sum, value) => sum + value, 0) / streakScores.length);

  return [
    { subject: 'Consistency', A: scoreConsistency, fullMark: 100 },
    { subject: 'Discipline', A: scoreDiscipline, fullMark: 100 },
    { subject: 'Responsibility', A: scoreResponsibility, fullMark: 100 },
    { subject: 'Devotion', A: scoreDevotion, fullMark: 100 },
    { subject: 'Focus', A: scoreFocus, fullMark: 100 },
  ];
}

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

  // Build a fast lookup: date -> status
  const logMap = new Map<string, HabitLog['status']>();
  for (const l of logs) {
    if (l.habitId === habitId) logMap.set(l.date, l.status);
  }

  const today = new Date();
  let longest = 0;
  let current = 0;

  // Walk backwards 365 days — mirrors getCurrentStreak so frequencyDays is respected
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    // Skip days this habit isn't scheduled — they don't count for or against the streak
    if (!habit.frequencyDays.includes(getDay(d))) continue;

    const dateStr = format(d, 'yyyy-MM-dd');
    const status = logMap.get(dateStr);

    if (status === 'skip') continue; // skip doesn't break streak
    if (status && validStatuses.includes(status)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0; // unlogged scheduled day — streak reset
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