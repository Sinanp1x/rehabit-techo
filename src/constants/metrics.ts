// src/constants/metrics.ts
export const COMPLETIONS_PER_LEVEL = 10;
export const STATS_LOOKBACK_DAYS = 30;
export const MAX_SCORE = 100;
export const DISCIPLINE_TARGET = 15;
export const RESPONSIBILITY_TARGET = 10;
export const DEVOTION_TARGET = 60;
export const FOCUS_TARGET = 15;

export const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_IN_WEEK = 7;

export const DEFAULT_TAGS = ['Health', 'Study', 'Spiritual', 'Family', 'Personal', 'Work', 'Fitness'];

export const DEFAULT_HABIT_COLORS = [
  '#7C3AED', // Purple (primary)
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#F97316', // Orange
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
];

export const TAG_COLORS: Record<string, string> = {
  Health: '#22C55E',
  Study: '#3B82F6',
  Spiritual: '#8B5CF6',
  Family: '#EC4899',
  Personal: '#F97316',
  Work: '#14B8A6',
  Fitness: '#EAB308',
};
