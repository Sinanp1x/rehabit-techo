// src/pages/PublicPodiumPage.tsx — Generate & share achievement card
import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';
import { Share2, Download, Trophy, Flame, Shield, Lock, Image, Sparkles, Dumbbell, BookOpen, Notebook, Droplet, Brain, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useHabits } from '../hooks/useHabits';
import { auth } from '../firebase';
import { getScheduledOccurrencesInRange, getCompletedOccurrencesInRange, getCurrentStreak } from '../utils/stats';
import { format, subDays } from 'date-fns';
import { useStore } from '../store/useStore';

const TIME_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '365', label: 'This year' },
];

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

export const PublicPodiumPage = () => {
  const { habits, allLogs } = useHabits();
  const { addToast, e2ee } = useStore();
  const user = auth.currentUser;
  const cardRef = useRef<HTMLDivElement>(null);

  const [selectedHabitIds, setSelectedHabitIds] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState('30');
  const [displayName, setDisplayName] = useState(user?.displayName || 'Anonymous');
  const [isGenerating, setIsGenerating] = useState(false);

  const trackableHabits = habits.filter((h) => h.type === 'habit');

  const toggleHabit = (id: number) =>
    setSelectedHabitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Compute stats for selected habits using the selected time range
  const selectedHabits = trackableHabits.filter((h) => selectedHabitIds.includes(h.id!));

  const days = parseInt(timeRange, 10);
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);

  const habitsWithSchedule = selectedHabits.filter(
    (h) => getScheduledOccurrencesInRange(h, startDate, endDate) > 0,
  );

  const overallCompletion = habitsWithSchedule.length === 0 ? 0 :
    Math.round(
      habitsWithSchedule.reduce((sum, h) => {
        const scheduled = getScheduledOccurrencesInRange(h, startDate, endDate);
        const completed = getCompletedOccurrencesInRange(h, allLogs, startDate, endDate);
        return sum + (completed / scheduled) * 100;
      }, 0) / habitsWithSchedule.length,
    );

  const badgeLabel =
    overallCompletion >= 90 ? '🏆 Elite Performer' :
    overallCompletion >= 75 ? '⭐ Top Performer' :
    overallCompletion >= 60 ? '💪 Consistent Builder' :
    '🌱 Growing Strong';

  const generateAndDownload = async () => {
    if (!cardRef.current || selectedHabits.length === 0) {
      addToast('Select at least one habit first', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `rehabi-achievement-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      addToast('Achievement card downloaded!', 'success');
    } catch {
      addToast('Failed to generate image', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareImage = async () => {
    if (!cardRef.current || selectedHabits.length === 0) {
      addToast('Select at least one habit first', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2 });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], 'rehabi-achievement.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Rehabi Techo Achievement',
          text: `${badgeLabel} — ${overallCompletion}% consistency!`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(
          `${badgeLabel} — ${overallCompletion}% consistency on Rehabi Techo!`,
        );
        addToast('Link copied! (Web Share not supported on this device)', 'info');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') addToast('Share failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar pb-28">
      <div className="px-5 pt-10 pb-5 bg-surface border-b border-border">
        <h1 className="text-2xl font-black text-text-main">Public Podium</h1>
        <p className="text-text-sub text-sm mt-1">Share your achievements as an image</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Config */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Display Name</p>
          <input
            type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
            placeholder="Your name on the card"
          />
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Time Range</p>
          <div className="grid grid-cols-2 gap-2">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={clsx(
                  'py-3 rounded-xl text-sm font-semibold transition-all border',
                  timeRange === r.value
                    ? 'bg-primary text-white border-primary shadow-glow-sm'
                    : 'bg-background text-text-sub border-border hover:border-primary',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            Select Habits ({selectedHabitIds.length} selected)
          </p>
          <div className="space-y-2">
            {trackableHabits.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No habits to show</p>
            ) : (
              trackableHabits.map((habit) => {
                const streak = getCurrentStreak(habit.id!, allLogs, habit);
                const isSelected = selectedHabitIds.includes(habit.id!);
                return (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id!)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected ? 'border-primary bg-primary/10' : 'border-border bg-background',
                    )}
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${habit.color}18` }}>
                      {getHabitIcon(habit.icon, habit.color)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-text-main">{habit.title}</span>
                    {streak > 0 && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={12} />
                        <span className="text-xs font-bold">{streak}</span>
                      </div>
                    )}
                    {isSelected && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Card Preview */}
        {selectedHabits.length > 0 && (
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Preview</p>
            {/* This div is captured as image */}
            <div
              ref={cardRef}
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                padding: '28px',
                minWidth: 340,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Rehabi Techo</p>
                  <p className="text-white font-black text-xl">{displayName}</p>
                  <p className="text-purple-300 text-xs">{TIME_RANGES.find((r) => r.value === timeRange)?.label}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}>
                  <Trophy size={28} className="text-white" />
                </div>
              </div>

              {/* Main stat */}
              <div className="text-center mb-5 py-4"
                style={{ background: 'rgba(124,58,237,0.15)', borderRadius: 16, border: '1px solid rgba(124,58,237,0.2)' }}>
                <p className="text-6xl font-black text-white mb-1">{overallCompletion}%</p>
                <p className="text-purple-300 text-sm font-semibold">Consistency Score</p>
                <p className="text-yellow-400 font-bold mt-2">{badgeLabel}</p>
              </div>

              {/* Habits list */}
              <div className="space-y-3 mb-5">
                {selectedHabits.map((habit) => {
                  const todayStr = format(new Date(), 'yyyy-MM-dd');
                  const isCompletedToday = allLogs.some(
                    (l) => l.habitId === habit.id && l.date === todayStr && (l.status === 'done' || l.status === 'partial')
                  );

                  // Total Committed Days in the last 30 days
                  const todayObj = new Date();
                  const totalCommittedDays = allLogs.filter((l) => {
                    if (l.habitId !== habit.id) return false;
                    if (l.status !== 'done' && l.status !== 'partial') return false;
                    
                    const logDate = new Date(l.date + 'T00:00:00');
                    const diffTime = todayObj.getTime() - logDate.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays < 30;
                  }).length;

                  const continuousStreak = getCurrentStreak(habit.id!, allLogs, habit);
                  const hideCommitted = totalCommittedDays === continuousStreak;

                  return (
                    <div
                      key={habit.id}
                      className="flex flex-col gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 14,
                        padding: '12px 16px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      {/* Top Row: Habit Color + Title + Today's Live Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${habit.color}15`,
                              border: `1px solid ${habit.color}30`
                            }}
                          >
                            {getHabitIcon(habit.icon, habit.color)}
                          </div>
                          <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }} className="truncate">
                            {habit.title}
                          </span>
                        </div>

                        {/* Real-time binary indicator */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: isCompletedToday ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                            border: isCompletedToday ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(148, 163, 184, 0.15)',
                            color: isCompletedToday ? '#4ADE80' : '#94A3B8'
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: isCompletedToday ? '#22C55E' : '#94A3B8',
                              boxShadow: isCompletedToday ? '0 0 8px #22C55E' : 'none'
                            }}
                          />
                          {isCompletedToday ? 'LIVE: DONE' : 'LIVE: PENDING'}
                        </div>
                      </div>

                      {/* Bottom Row: Streak metrics */}
                      <div className="flex items-center gap-3 mt-1 justify-end">
                        {!hideCommitted && (
                          <div
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{
                              background: 'rgba(167, 139, 250, 0.1)',
                              color: '#C084FC',
                              border: '1px solid rgba(167, 139, 250, 0.15)'
                            }}
                          >
                            <span>Committed: {totalCommittedDays}d</span>
                          </div>
                        )}
                        
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: 'rgba(251, 146, 60, 0.15)',
                            color: '#FB923C',
                            border: '1px solid rgba(251, 146, 60, 0.25)'
                          }}
                        >
                          <span>Streak: {continuousStreak}d 🔥</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-4"
                style={{ borderTop: '1px solid rgba(124,58,237,0.2)' }}>
                {e2ee.enabled ? (
                  <>
                    <Shield size={14} style={{ color: '#22C55E' }} />
                    <p style={{ color: '#94A3B8', fontSize: 11 }}>
                      This data is end-to-end encrypted and verified — I cannot cheat.
                    </p>
                  </>
                ) : (
                  <>
                    <Lock size={14} style={{ color: '#7C3AED' }} />
                    <p style={{ color: '#94A3B8', fontSize: 11 }}>rehabitecho.p1xion.app</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateAndDownload}
            disabled={isGenerating || selectedHabits.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-surface border border-border rounded-2xl text-text-main font-semibold active:scale-98 disabled:opacity-40 transition-all"
          >
            <Download size={18} />
            Download
          </button>
          <button
            onClick={shareImage}
            disabled={isGenerating || selectedHabits.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-2xl font-semibold shadow-glow active:scale-98 disabled:opacity-40 transition-all"
          >
            {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Share2 size={18} />}
            Share
          </button>
        </div>

        {e2ee.enabled && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Lock size={14} className="text-green-400 shrink-0" />
            <p className="text-xs text-green-400">E2EE is active — your data is encrypted in Firestore</p>
          </div>
        )}
      </div>
    </div>
  );
};
