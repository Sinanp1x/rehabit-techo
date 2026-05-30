// src/pages/StatsPage.tsx — Comprehensive analytics with fixed streaks & timeline
import { Fragment, useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useHabits } from '../hooks/useHabits';
import { auth } from '../firebase';
import { useStore } from '../store/useStore';
import { Flame, Trophy, Calendar, Download, Activity, ChevronLeft, ChevronRight, TrendingUp, Target, Sparkles, Dumbbell, BookOpen, Notebook, Droplet, Brain, Clock } from 'lucide-react';
import { clsx } from 'clsx';

const getHabitIcon = (iconName?: string, color?: string) => {
  const iconStyle = { color: color || 'var(--color-primary)' };
  switch (iconName) {
    case 'spiritual': return <Sparkles size={14} style={iconStyle} />;
    case 'exercise': return <Dumbbell size={14} style={iconStyle} />;
    case 'book': return <BookOpen size={14} style={iconStyle} />;
    case 'journal': return <Notebook size={14} style={iconStyle} />;
    case 'hydration': return <Droplet size={14} style={iconStyle} />;
    case 'deepwork': return <Clock size={14} style={iconStyle} />;
    case 'meditation': return <Brain size={14} style={iconStyle} />;
    default: return <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color || 'var(--color-primary)' }} />;
  }
};
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, getDay, isBefore } from 'date-fns';
import {
  COMPLETIONS_PER_LEVEL,
  STATS_LOOKBACK_DAYS,
} from '../constants/metrics';
import {
  getWeeklyCompletionPct,
  getMonthlyCompletionPcts,
  getCurrentStreak,
  getLongestStreak,
  getCategoryCompletionData,
  getPersonalityRadarData,
} from '../utils/stats';
import { fetchRemoteLogsInRange, getRollingHistoryStartDate, mergeLogsForStats } from '../services/history';
import type { HabitLog } from '../db';

const CHART_COLORS = ['#7C3AED', '#3B82F6', '#14B8A6', '#EC4899', '#F97316', '#22C55E', '#EAB308'];
const HEATMAP_DAY_WIDTH = 34;
const HEATMAP_NAME_WIDTH = 160;

const useMeasuredWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const updateWidth = () => {
      setWidth(Math.round(node.getBoundingClientRect().width));
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
};

export const StatsPage = () => {
  const { habits = [], allLogs = [] } = useHabits() || { habits: [], allLogs: [] };
  const { realtimeLoading, realtimeReady } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [remoteLogs, setRemoteLogs] = useState<HabitLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [monthlyChartRef, monthlyChartWidth] = useMeasuredWidth();
  const [pieChartRef, pieChartWidth] = useMeasuredWidth();
  const [radarChartRef, radarChartWidth] = useMeasuredWidth();

  const userId = auth.currentUser?.uid;

  const trackableHabits = useMemo(() => (habits || []).filter((h) => h && h.type === 'habit'), [habits]);
  const trackableHabitIds = useMemo(() => 
    trackableHabits.map((habit) => habit.id).filter((id): id is number => typeof id === 'number'),
    [trackableHabits]
  );

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!userId) {
        setRemoteLogs([]);
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      try {
        const logs = await fetchRemoteLogsInRange(getRollingHistoryStartDate());
        if (!cancelled) setRemoteLogs(logs || []);
      } catch {
        if (!cancelled) setRemoteLogs([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const statsLogs = useMemo(() => mergeLogsForStats(allLogs || [], remoteLogs || []) || [], [allLogs, remoteLogs]);
  
  const habitLogs = useMemo(() => {
    return (statsLogs || []).filter((log) => log && trackableHabitIds.includes(log.habitId)) || [];
  }, [statsLogs, trackableHabitIds]);

  const today = useMemo(() => new Date(), []);
  
  const totalCompletions = useMemo(() => {
    return habitLogs.filter((l) => l && (l.status === 'done' || l.status === 'partial')).length || 0;
  }, [habitLogs]);

  const level = useMemo(() => Math.floor(totalCompletions / COMPLETIONS_PER_LEVEL) + 1, [totalCompletions]);

  // Best streak across all habits
  const bestStreak = useMemo(() => {
    if (trackableHabits.length === 0) return 0;
    const streaks = trackableHabits.map((h) => h.id ? getLongestStreak(h.id, statsLogs, h) : 0);
    return streaks.length > 0 ? Math.max(0, ...streaks) : 0;
  }, [trackableHabits, statsLogs]);

  const weeklyPct = useMemo(() => getWeeklyCompletionPct(trackableHabits, statsLogs) || 0, [trackableHabits, statsLogs]);

  // Last 7 days bar data
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd') || '';
      const dayIndex = getDay(d);
      const scheduled = trackableHabits.filter((h) => h.frequencyDays?.includes(dayIndex)).length;
      const done = habitLogs.filter((l) => l.date === dateStr && (l.status === 'done' || l.status === 'partial')).length;
      const score = scheduled === 0 ? 0 : Math.min(100, Math.round((done / scheduled) * 100));
      return { dayName: format(d, 'EEE') || '', isToday: isSameDay(d, today), score: score || 0, done: done || 0, scheduled: scheduled || 0 };
    }) || [];
  }, [trackableHabits, habitLogs, today]);

  // Monthly timeline (last 6 months)
  const monthlyData = useMemo(() => {
    return getMonthlyCompletionPcts(trackableHabits, statsLogs, 6) || [];
  }, [trackableHabits, statsLogs]);

  // Category pie chart
  const historyStartDate = useMemo(() => startOfMonth(subMonths(today, 11)), [today]);
  const categoryData = useMemo(() => {
    return getCategoryCompletionData(trackableHabits, statsLogs, historyStartDate, today) || [];
  }, [trackableHabits, statsLogs, historyStartDate, today]);
  const categorySlices = useMemo(() => categoryData.filter((item) => item.value > 0), [categoryData]);

  // Personality radar
  const personalityData = useMemo(() => {
    return getPersonalityRadarData(habits || [], statsLogs, STATS_LOOKBACK_DAYS) || [];
  }, [habits, statsLogs]);

  // Rolling 12-month continuous dates sequence for the new Heatmap Timeline Grid
  const startOfTimeline = useMemo(() => startOfMonth(subMonths(currentDate, 11)), [currentDate]);
  const endOfTimeline = useMemo(() => endOfMonth(currentDate), [currentDate]);
  
  const datesTimeline = useMemo(() => {
    try {
      return eachDayOfInterval({ start: startOfTimeline, end: endOfTimeline }) || [];
    } catch {
      return [];
    }
  }, [startOfTimeline, endOfTimeline]);

  // Autoscroll scrollRef to show the latest dates on mount/dates calculated
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [datesTimeline]);

  // Month calendar variables for CSV Export compatibility
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = useMemo(() => {
    try {
      return eachDayOfInterval({ start: monthStart, end: monthEnd }) || [];
    } catch {
      return [];
    }
  }, [monthStart, monthEnd]);

  const minVisibleMonth = startOfMonth(subMonths(today, 11));
  const canGoBackward = isBefore(minVisibleMonth, monthStart);
  const canGoForward = isBefore(monthStart, startOfMonth(today));

  // CSV Export
  const handleExport = () => {
    const headers = ['Date', ...trackableHabits.map((h) => h.title || 'Untitled')];
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
    link.download = `Rehabi_${format(currentDate, 'MMM_yyyy') || 'export'}.csv`;
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
        <div ref={monthlyChartRef} className="h-40 w-full min-w-0">
          {monthlyChartWidth > 0 ? (
            <AreaChart width={monthlyChartWidth} height={160} data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
          ) : (
            <div className="h-full w-full rounded-xl shimmer" />
          )}
        </div>
      </div>

      {/* Category Balance Pie */}
      <div className="glass rounded-2xl p-5 mb-5">
        <h3 className="font-bold text-text-main mb-4">Category Balance</h3>
        {categorySlices.length > 0 ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative w-full max-w-[320px] aspect-square">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${categorySlices
                    .map((entry, index) => {
                      const total = categorySlices.reduce((sum, item) => sum + item.value, 0) || 1;
                      const start = categorySlices.slice(0, index).reduce((sum, item) => sum + item.value, 0);
                      const startPct = (start / total) * 100;
                      const endPct = ((start + entry.value) / total) * 100;
                      return `${entry.color || CHART_COLORS[index % CHART_COLORS.length]} ${startPct}% ${endPct}%`;
                    })
                    .join(', ')})`,
                }}
              />
              <div className="absolute inset-[18%] rounded-full border border-border bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Done</span>
                <span className="text-3xl font-black text-text-main leading-none mt-2">
                  {categorySlices.reduce((sum, item) => sum + item.value, 0)}
                </span>
                <span className="text-xs text-text-muted mt-2">completed habits</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color || CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
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
        <div ref={radarChartRef} className="h-52 w-full min-w-0">
          {radarChartWidth > 0 ? (
            <RadarChart width={radarChartWidth} height={208} cx="50%" cy="50%" outerRadius="70%" data={personalityData}>
              <PolarGrid stroke="#2A2A4A" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="You" dataKey="A" stroke="#7C3AED" strokeWidth={2.5} fill="#7C3AED" fillOpacity={0.25} />
              <Tooltip contentStyle={{ background: '#16213E', border: '1px solid #2A2A4A', borderRadius: 12, color: '#F1F5F9' }} />
            </RadarChart>
          ) : (
            <div className="h-full w-full rounded-xl shimmer" />
          )}
        </div>
      </div>

      {/* Habit Heatmap Table */}
      <div className="glass rounded-2xl overflow-hidden mb-5 flex flex-col" style={{ minHeight: 420 }}>
        <div className="p-5 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h3 className="font-bold text-text-main text-base">Rolling 12-Month Timeline</h3>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            A continuous historical record of active habits spanning the last 12 months. Scroll horizontally to browse dates (autoscrolls to today).
          </p>
        </div>
        
        <div className="p-4 flex-1" style={{ minHeight: 320 }}>
          {realtimeLoading && !realtimeReady ? (
            <div className="px-4 py-10 text-center text-text-muted text-sm">
              Loading habits and monthly history...
            </div>
          ) : trackableHabits.length > 0 ? (
            <div>
              {/* Outer scroll container */}
              <div 
                ref={scrollRef}
                className="overflow-x-auto custom-scrollbar overflow-y-hidden w-full"
                style={{ willChange: 'transform', scrollBehavior: 'smooth' }}
              >
                <div
                  className="grid gap-0 min-w-max"
                  style={{ gridTemplateColumns: `180px repeat(${datesTimeline.length}, 36px)` }}
                >
                  {/* Habits Header Column */}
                  <div className="sticky left-0 top-0 z-20 bg-surface border-b border-r border-border px-4 py-3 text-left text-xs font-black text-text-muted uppercase tracking-wider w-[180px] h-[52px] shrink-0 flex items-center">
                    Habits
                  </div>
                  
                  {/* Timeline Header Cells */}
                  {datesTimeline.map((day, index) => {
                    const isMonthStart = day.getDate() === 1 || index === 0;
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        className={clsx(
                          'border-b border-border text-center w-[36px] h-[52px] shrink-0 flex flex-col items-center justify-center relative',
                          isToday ? 'bg-primary/10' : 'bg-surface',
                        )}
                      >
                        {isMonthStart && (
                          <span className="absolute top-1 text-[8px] font-black uppercase text-primary tracking-tight">
                            {format(day, 'MMM')}
                          </span>
                        )}
                        <div className={clsx('text-[8px] font-bold uppercase leading-none mt-2', isToday ? 'text-primary' : 'text-text-muted')}>
                          {format(day, 'EEEEE')}
                        </div>
                        <div className={clsx('w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-medium mx-auto mt-0.5', isToday ? 'bg-primary text-white' : 'text-text-muted')}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}

                  {/* Rows mapping out active habits & dates */}
                  {trackableHabits.map((habit) => (
                    <Fragment key={`row-${habit.id}`}>
                      <div
                        key={`name-${habit.id}`}
                        className="sticky left-0 z-10 bg-card border-r border-b border-border/50 px-3 py-2 w-[180px] h-[36px] shrink-0 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${habit.color}15` }}>
                          {getHabitIcon(habit.icon, habit.color)}
                        </div>
                        <span className="truncate text-xs font-bold text-text-sub">{habit.title}</span>
                      </div>
                      
                      {datesTimeline.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const log = statsLogs.find((entry) => entry.habitId === habit.id && entry.date === dateStr);
                        
                        let cellBg = '';
                        let cellClass = 'w-4 h-4 rounded-full transition-all duration-150 ';

                        if (log) {
                          if (log.status === 'done') {
                            cellBg = habit.color;
                            cellClass += 'scale-100 shadow-sm opacity-100';
                          } else if (log.status === 'partial') {
                            cellBg = habit.color;
                            cellClass += 'scale-100 shadow-sm opacity-50';
                          } else { // skipped
                            cellBg = '#3B82F6';
                            cellClass += 'scale-100 shadow-sm opacity-80';
                          }
                        } else {
                          // Clean neutral placeholder
                          cellClass += 'scale-75 opacity-100 bg-border/25 dark:bg-border/10 border border-border/5 hover:bg-border/40';
                        }

                        return (
                          <div key={`${habit.id}-${dateStr}`} className={clsx('border-b border-border/50 border-r border-border/30 p-1 w-[36px] h-[36px] shrink-0 flex items-center justify-center', isSameDay(day, new Date()) ? 'bg-primary/5' : 'bg-card')}>
                            <div
                              className={cellClass}
                              style={cellBg ? { backgroundColor: cellBg } : undefined}
                              title={`${habit.title} · ${format(day, 'MMM d, yyyy')} ${log ? `· ${log.status}` : '· Incomplete'}`}
                            />
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
              
              {/* Legend of statuses */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted border-t border-border pt-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary" /> Done</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/40" /> Partial</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" /> Skipped</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-border/25 dark:bg-border/10 border border-border/5" /> Incomplete</div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-text-muted text-sm">
              Add at least one habit to see the heatmap.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};