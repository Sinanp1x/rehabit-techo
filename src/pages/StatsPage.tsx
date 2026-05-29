// src/pages/StatsPage.tsx — Comprehensive analytics with fixed streaks & timeline
import { useState, useEffect, lazy, Suspense } from 'react';
import { useHabits } from '../hooks/useHabits';
import { Flame, Trophy, Calendar, Download, Activity, ChevronLeft, ChevronRight, TrendingUp, Target } from 'lucide-react';
import { clsx } from 'clsx';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, getDay } from 'date-fns';
import {
  COMPLETIONS_PER_LEVEL, STATS_LOOKBACK_DAYS, MAX_SCORE,
  DISCIPLINE_TARGET, RESPONSIBILITY_TARGET, DEVOTION_TARGET, FOCUS_TARGET,
} from '../constants/metrics';
import { getWeeklyCompletionPct, getMonthlyCompletionPcts, getCurrentStreak, getLongestStreak } from '../utils/stats';

const CHART_COLORS = ['#7C3AED', '#3B82F6', '#14B8A6', '#EC4899', '#F97316', '#22C55E', '#EAB308'];

export const StatsPage = () => {
  const { habits = [], allLogs = [] } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());

  const trackableHabits = habits.filter((h) => h.type === 'habit');
  const habitIds = trackableHabits.map((h) => h.id);
  const habitLogs = allLogs.filter((l) => habitIds.includes(l.habitId));

  const today = new Date();
  const totalCompletions = habitLogs.filter((l) => l.status === 'done' || l.status === 'partial').length;
  const level = Math.floor(totalCompletions / COMPLETIONS_PER_LEVEL) + 1;

  // Best streak across all habits
  const bestStreak = Math.max(0, ...trackableHabits.map((h) => getLongestStreak(h.id!, allLogs, h)));
  const weeklyPct = getWeeklyCompletionPct(trackableHabits, allLogs);

  // Last 7 days bar data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayIndex = getDay(d);
    const scheduled = trackableHabits.filter((h) => h.frequencyDays.includes(dayIndex)).length;
    const done = habitLogs.filter((l) => l.date === dateStr && (l.status === 'done' || l.status === 'partial')).length;
    const score = scheduled === 0 ? 0 : Math.min(100, Math.round((done / scheduled) * 100));
    return { dayName: format(d, 'EEE'), isToday: isSameDay(d, today), score, done, scheduled };
  });

  // Monthly timeline (last 6 months)
  const monthlyData = getMonthlyCompletionPcts(trackableHabits, allLogs, 6);

  // Category pie chart
  const categoryData = trackableHabits.reduce((acc: any[], habit) => {
    const count = habitLogs.filter((l) => l.habitId === habit.id).length;
    if (count === 0) return acc;
    for (const tag of habit.tags) {
      const existing = acc.find((c: any) => c.name === tag);
      if (existing) existing.value += count;
      else acc.push({ name: tag, value: count, color: habit.color });
    }
    return acc;
  }, []);

  // Personality radar
  const recentLogs = allLogs.filter((l) => l.date >= format(subDays(today, STATS_LOOKBACK_DAYS), 'yyyy-MM-dd'));
  const activeDays = new Set(recentLogs.map((l) => l.date)).size;
  const scoreConsistency = Math.min(MAX_SCORE, (activeDays / STATS_LOOKBACK_DAYS) * 100);
  const habitItems = habits.filter((h) => h.type === 'habit');
  const habitLogCount = recentLogs.filter((l) => habits.find((h) => h.id === l.habitId)?.type === 'habit').length;
  const scoreDiscipline = habitItems.length ? Math.min(MAX_SCORE, (habitLogCount / (habitItems.length * DISCIPLINE_TARGET)) * 100) : 0;
  const reminderItems = habits.filter((h) => h.type === 'reminder');
  const reminderLogCount = recentLogs.filter((l) => habits.find((h) => h.id === l.habitId)?.type === 'reminder').length;
  const scoreResponsibility = reminderItems.length ? Math.min(MAX_SCORE, (reminderLogCount / (reminderItems.length * RESPONSIBILITY_TARGET)) * 100) : 0;
  const scoreDevotion = Math.min(MAX_SCORE, (recentLogs.length / DEVOTION_TARGET) * 100);
  const timedItems = habits.filter((h) => h.hasTime);
  const timedLogCount = recentLogs.filter((l) => habits.find((h) => h.id === l.habitId)?.hasTime).length;
  const scoreFocus = timedItems.length ? Math.min(MAX_SCORE, (timedLogCount / (timedItems.length * FOCUS_TARGET)) * 100) : 0;

  const personalityData = [
    { subject: 'Consistency', A: Math.round(scoreConsistency), fullMark: MAX_SCORE },
    { subject: 'Discipline', A: Math.round(scoreDiscipline), fullMark: MAX_SCORE },
    { subject: 'Responsibility', A: Math.round(scoreResponsibility), fullMark: MAX_SCORE },
    { subject: 'Devotion', A: Math.round(scoreDevotion), fullMark: MAX_SCORE },
    { subject: 'Focus', A: Math.round(scoreFocus), fullMark: MAX_SCORE },
  ];

  // Month calendar
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // CSV Export
  const handleExport = () => {
    const headers = ['Date', ...trackableHabits.map((h) => h.title)];
    const rows = daysInMonth.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const rowData = trackableHabits.map((h) => {
        const log = habitLogs.find((l) => l.habitId === h.id && l.date === dateStr);
        return log ? log.status : '-';
      });
      return [dateStr, ...rowData];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rehabit_${format(currentDate, 'MMM_yyyy')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar p-5 pt-10 pb-28">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-text-main">Reports</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold active:scale-95 shadow-glow-sm"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: <Flame size={22} className="text-orange-400 flame-anim" />, value: totalCompletions, label: 'Total Done', bg: 'bg-orange-500/10 border-orange-500/20' },
          { icon: <Trophy size={22} className="text-yellow-400" />, value: `Lv.${level}`, label: 'Level', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { icon: <Target size={22} className="text-green-400" />, value: `${weeklyPct}%`, label: 'This Week', bg: 'bg-green-500/10 border-green-500/20' },
          { icon: <TrendingUp size={22} className="text-purple-400" />, value: bestStreak, label: 'Best Streak', bg: 'bg-purple-500/10 border-purple-500/20' },
        ].map((stat, i) => (
          <div key={i} className={clsx('p-4 rounded-2xl border flex flex-col items-center py-5', stat.bg)}>
            <div className="mb-2">{stat.icon}</div>
            <span className="text-2xl font-black text-text-main">{stat.value}</span>
            <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Last 7 Days */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-primary" />
          <h3 className="font-bold text-text-main">Last 7 Days</h3>
        </div>
        <div className="flex justify-between items-end gap-2">
          {last7Days.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-full flex justify-center">
                <div className="w-full max-w-[32px] bg-border rounded-full overflow-hidden" style={{ height: 64 }}>
                  <div
                    className="w-full rounded-full transition-all duration-700"
                    style={{
                      height: `${day.score}%`,
                      marginTop: `${100 - day.score}%`,
                      background: day.score >= 80 ? '#22C55E' : day.score >= 40 ? '#7C3AED' : day.score > 0 ? '#3B82F6' : '#2A2A4A',
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <span className={clsx('text-xs font-bold block', day.isToday ? 'text-primary' : 'text-text-muted')}>
                  {day.dayName}
                </span>
                <span className="text-[10px] text-text-muted">{day.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Timeline */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-accent-teal" />
          <h3 className="font-bold text-text-main">6-Month Progress</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A4A" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#16213E', border: '1px solid #2A2A4A', borderRadius: 12, color: '#F1F5F9' }}
                formatter={(v: any) => [`${v}%`, 'Completion']}
              />
              <Area type="monotone" dataKey="pct" stroke="#7C3AED" strokeWidth={2} fill="url(#gradPct)" dot={{ fill: '#7C3AED', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Balance Pie */}
      <div className="glass rounded-2xl p-5 mb-5">
        <h3 className="font-bold text-text-main mb-4">Category Balance</h3>
        {categoryData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#16213E', border: '1px solid #2A2A4A', borderRadius: 12, color: '#F1F5F9' }}
                />
                <Legend iconType="circle" wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-text-muted text-sm">
            Complete habits to see the chart
          </div>
        )}
      </div>

      {/* Personality Radar */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={16} className="text-purple-400" />
          <h3 className="font-bold text-text-main">Your Stats Profile</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">Based on last {STATS_LOOKBACK_DAYS} days</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={personalityData}>
              <PolarGrid stroke="#2A2A4A" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="You" dataKey="A" stroke="#7C3AED" strokeWidth={2.5} fill="#7C3AED" fillOpacity={0.25} />
              <Tooltip contentStyle={{ background: '#16213E', border: '1px solid #2A2A4A', borderRadius: 12, color: '#F1F5F9' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Habit Heatmap Table */}
      <div className="glass rounded-2xl overflow-hidden mb-5">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => setCurrentDate((d) => subMonths(d, 1))} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-text-sub" />
          </button>
          <h3 className="font-bold text-text-main">{format(currentDate, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentDate((d) => addMonths(d, 1))} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <ChevronRight size={18} className="text-text-sub" />
          </button>
        </div>
        <div className="overflow-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-max">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left text-xs font-bold text-text-muted uppercase tracking-wide sticky left-0 bg-surface z-20 border-r border-border min-w-[100px]">Habit</th>
                {daysInMonth.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={day.toString()} className={clsx('p-1 min-w-[32px] text-center', isToday ? 'bg-primary/10' : '')}>
                      <div className={clsx('text-[9px] font-bold uppercase', isToday ? 'text-primary' : 'text-text-muted')}>
                        {format(day, 'EEEEE')}
                      </div>
                      <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mx-auto mt-0.5', isToday ? 'bg-primary text-white' : 'text-text-muted')}>
                        {format(day, 'd')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {trackableHabits.map((habit) => (
                <tr key={habit.id} className="border-b border-border/50">
                  <td className="p-2 text-xs font-medium sticky left-0 z-10 border-r border-border/50 bg-card min-w-[100px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                      <span className="truncate text-text-sub">{habit.title}</span>
                    </div>
                  </td>
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const log = allLogs.find((l) => l.habitId === habit.id && l.date === dateStr);
                    return (
                      <td key={`${habit.id}-${dateStr}`} className="p-1 text-center">
                        <div
                          className={clsx('w-5 h-5 rounded-md mx-auto transition-all', log ? 'scale-100' : 'scale-75 opacity-20')}
                          style={{
                            backgroundColor: log
                              ? log.status === 'done' ? habit.color
                              : log.status === 'partial' ? habit.color + '80'
                              : '#3B82F6'
                              : '#2A2A4A',
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="px-4 py-3 flex gap-4 text-xs text-text-muted border-t border-border">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary" /> Done</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/40" /> Partial</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /> Skipped</div>
        </div>
      </div>
    </div>
  );
};