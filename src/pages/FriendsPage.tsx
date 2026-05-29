// src/pages/FriendsPage.tsx — Friends, Leaderboard, and Podium competitions
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, UserPlus, Copy, Search, CheckCircle2, XCircle, Loader2, TrendingUp, Medal, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import { auth } from '../firebase';
import { db, type Friend } from '../db';
import {
  getMyFriendCode,
  findUserByFriendCode,
  updateShareStats,
} from '../services/profile';
import { getFriendWeeklyStats, sendFriendRequest } from '../services/sync';
import { useHabits } from '../hooks/useHabits';
import { getWeeklyCompletionPct } from '../utils/stats';
import { useStore } from '../store/useStore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';

interface FriendWithStats extends Friend {
  weeklyPct?: number;
  totalCompletions?: number;
  loading?: boolean;
}

export const FriendsPage = () => {
  const { habits, allLogs } = useHabits();
  const { addToast } = useStore();
  const user = auth.currentUser;

  const [tab, setTab] = useState<'friends' | 'leaderboard'>('friends');
  const [myCode, setMyCode] = useState('Loading...');
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ uid: string; displayName: string; friendCode: string } | null>(null);
  const [friends, setFriends] = useState<FriendWithStats[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [shareStats, setShareStats] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const myWeeklyPct = getWeeklyCompletionPct(habits.filter((h) => h.type === 'habit'), allLogs);
  const myTotalCompletions = allLogs.filter((l) => l.status === 'done' || l.status === 'partial').length;

  // Load my friend code
  useEffect(() => {
    getMyFriendCode().then(setMyCode);
  }, []);

  // Load friends from Dexie
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const localFriends = await db.friends.where('userId').equals(user.uid).toArray();
      const withStats: FriendWithStats[] = localFriends.map((f) => ({ ...f, loading: true }));
      setFriends(withStats);
      // Load stats for each friend
      for (const friend of localFriends) {
        const stats = await getFriendWeeklyStats(friend.friendUid);
        setFriends((prev) =>
          prev.map((f) =>
            f.friendUid === friend.friendUid
              ? { ...f, weeklyPct: stats?.weeklyPct ?? 0, totalCompletions: stats?.totalCompletions ?? 0, loading: false }
              : f,
          ),
        );
      }
    };
    load();
  }, [user]);

  // Listen for incoming friend requests
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'friend_requests'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setIncomingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    addToast('Friend code copied!', 'success');
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const result = await findUserByFriendCode(searchCode.trim());
      if (result) {
        if (result.uid === user?.uid) {
          addToast("That's your own code!", 'warning');
        } else {
          setSearchResult(result);
        }
      } else {
        addToast('No user found with that code', 'error');
      }
    } catch {
      addToast('Search failed — check your connection', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user) return;
    setIsSendingRequest(true);
    try {
      await sendFriendRequest(searchResult.uid, searchResult.displayName, myCode, user.displayName || 'User');
      addToast(`Friend request sent to ${searchResult.displayName}!`, 'success');
      setSearchResult(null);
      setSearchCode('');
    } catch {
      addToast('Failed to send request', 'error');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const acceptRequest = async (req: any) => {
    if (!user) return;
    try {
      const { acceptFriendRequest } = await import('../services/sync');
      await acceptFriendRequest(req.id);
      // Save to local DB
      await db.friends.add({
        userId: user.uid,
        friendUid: req.fromUid,
        displayName: req.fromDisplayName,
        friendCode: req.fromCode,
        shareStats: true,
        connectedAt: new Date().toISOString(),
      });
      addToast(`${req.fromDisplayName} is now your friend!`, 'success');
    } catch {
      addToast('Failed to accept request', 'error');
    }
  };

  const declineRequest = async (req: any) => {
    const { declineFriendRequest } = await import('../services/sync');
    await declineFriendRequest(req.id);
    addToast('Request declined', 'info');
  };

  // Leaderboard — sort by weekly %
  const leaderboard = [
    { displayName: user?.displayName || 'You', weeklyPct: myWeeklyPct, totalCompletions: myTotalCompletions, isMe: true },
    ...friends.filter((f) => f.weeklyPct !== undefined).map((f) => ({
      displayName: f.displayName,
      weeklyPct: f.weeklyPct ?? 0,
      totalCompletions: f.totalCompletions ?? 0,
      isMe: false,
    })),
  ].sort((a, b) => b.weeklyPct - a.weeklyPct);

  const podiumIcons = [
    <Crown size={20} className="text-yellow-400" />,
    <Medal size={20} className="text-gray-400" />,
    <Medal size={20} className="text-orange-400" />,
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-5 bg-surface border-b border-border">
        <h1 className="text-2xl font-black text-text-main mb-4">Friends</h1>
        {/* Tabs */}
        <div className="bg-background p-1 rounded-xl flex gap-1">
          {(['friends', 'leaderboard'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2',
                tab === t ? 'bg-primary text-white shadow-glow-sm' : 'text-text-sub',
              )}
            >
              {t === 'friends' ? <><Users size={14} /> Friends</> : <><Trophy size={14} /> Leaderboard</>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {tab === 'friends' && (
          <>
            {/* My Code */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Your Friend Code</p>
              <div className="flex gap-3 items-center">
                <div className="flex-1 bg-background rounded-2xl p-4 text-center font-mono font-black text-2xl tracking-[0.3em] text-primary border border-primary/30">
                  {myCode}
                </div>
                <button onClick={copyCode}
                  className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20 hover:bg-primary/20 active:scale-95">
                  <Copy size={20} />
                </button>
              </div>
              <p className="text-xs text-text-muted mt-3 text-center">Share this code to let friends connect with you</p>
            </div>

            {/* Share Stats Toggle */}
            <div className="glass rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-main text-sm">Share my stats with friends</p>
                <p className="text-xs text-text-muted mt-0.5">Let friends see your weekly completion %</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={shareStats}
                  onChange={(e) => { setShareStats(e.target.checked); updateShareStats(e.target.checked); }}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Search friend */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Add a Friend</p>
              <div className="flex gap-2">
                <input
                  type="text" value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter friend's code (e.g. ABC-1234)"
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 font-mono text-text-main placeholder:text-text-muted placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-primary"
                />
                <button onClick={handleSearch} disabled={isSearching}
                  className="px-4 py-3 bg-primary text-white rounded-xl font-semibold active:scale-95 disabled:opacity-50">
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </button>
              </div>

              {searchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-background rounded-xl border border-primary/30 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-text-main">{searchResult.displayName}</p>
                    <p className="text-xs text-text-muted font-mono">{searchResult.friendCode}</p>
                  </div>
                  <button
                    onClick={handleSendRequest} disabled={isSendingRequest}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold active:scale-95 disabled:opacity-50"
                  >
                    {isSendingRequest ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Send Request
                  </button>
                </motion.div>
              )}
            </div>

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Friend Requests ({incomingRequests.length})
                </p>
                <div className="space-y-3">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                      <div>
                        <p className="font-semibold text-text-main text-sm">{req.fromDisplayName}</p>
                        <p className="text-xs text-text-muted font-mono">{req.fromCode}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(req)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                          <CheckCircle2 size={18} />
                        </button>
                        <button onClick={() => declineRequest(req)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                My Friends ({friends.length})
              </p>
              {friends.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <Users size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No friends yet. Share your code to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.friendUid} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                      <div>
                        <p className="font-semibold text-text-main">{friend.displayName}</p>
                        <p className="text-xs text-text-muted font-mono">{friend.friendCode}</p>
                      </div>
                      <div className="text-right">
                        {friend.loading ? (
                          <Loader2 size={16} className="animate-spin text-text-muted ml-auto" />
                        ) : friend.weeklyPct !== undefined ? (
                          <>
                            <p className="font-black text-primary text-lg">{friend.weeklyPct}%</p>
                            <p className="text-xs text-text-muted">this week</p>
                          </>
                        ) : (
                          <p className="text-xs text-text-muted italic">Stats private</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Trophy size={20} className="text-yellow-400" />
                <h3 className="font-bold text-text-main">Weekly Completion Leaderboard</h3>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-center text-text-muted py-8 text-sm">Add friends to see the leaderboard!</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, rank) => (
                    <motion.div
                      key={entry.displayName}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: rank * 0.1 }}
                      className={clsx(
                        'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                        entry.isMe
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-background border-border',
                        rank === 0 && 'border-yellow-500/30 bg-yellow-500/5',
                      )}
                    >
                      <div className="w-8 text-center">
                        {rank < 3 ? podiumIcons[rank] : (
                          <span className="text-text-muted font-bold text-sm">#{rank + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={clsx('font-bold text-sm', entry.isMe ? 'text-primary' : 'text-text-main')}>
                          {entry.displayName} {entry.isMe && '(you)'}
                        </p>
                        <p className="text-xs text-text-muted">{entry.totalCompletions} total completions</p>
                      </div>
                      <div className="text-right">
                        <p className={clsx('font-black text-xl', rank === 0 ? 'text-yellow-400' : entry.isMe ? 'text-primary' : 'text-text-main')}>
                          {entry.weeklyPct}%
                        </p>
                        <p className="text-xs text-text-muted">this week</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <p className="text-xs text-text-muted text-center mt-5">
                🔒 Only weekly completion % is shared — no habit details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
