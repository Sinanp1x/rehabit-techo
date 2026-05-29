// src/services/profile.ts — Friend code & profile management
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import { firestore, auth } from '../firebase';
import { db } from '../db';

// Generate a unique 7-char alphanumeric friend code
function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const values = crypto.getRandomValues(new Uint8Array(7));
  for (const v of values) code += chars[v % chars.length];
  return `${code.slice(0, 3)}-${code.slice(3, 7)}`;
}

// ─────────────────────────────────────────────
// Get or create this user's friend code
// ─────────────────────────────────────────────

export const getMyFriendCode = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return '???-????';

  // Check Firestore first
  const ref = doc(firestore, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data()?.friendCode) {
    return snap.data()!.friendCode;
  }

  // Generate and save a new code
  const code = generateFriendCode();
  await setDoc(
    ref,
    {
      friendCode: code,
      displayName: user.displayName || 'User',
      uid: user.uid,
      email: user.email,
      shareStats: false,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return code;
};

// ─────────────────────────────────────────────
// Find a user by friend code
// ─────────────────────────────────────────────

export const findUserByFriendCode = async (
  code: string,
): Promise<{ uid: string; displayName: string; friendCode: string } | null> => {
  try {
    const q = query(
      collection(firestore, 'users'),
      where('friendCode', '==', code.toUpperCase()),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data();
    return {
      uid: d.uid || snap.docs[0].id,
      displayName: d.displayName || 'User',
      friendCode: d.friendCode,
    };
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────
// Check if a user has opted in to share their stats
// ─────────────────────────────────────────────

export const checkFriendSharesStats = async (uid: string): Promise<boolean> => {
  try {
    const ref = doc(firestore, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() && snap.data()?.shareStats === true;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// Update our share stats preference
// ─────────────────────────────────────────────

export const updateShareStats = async (share: boolean): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(firestore, 'users', user.uid);
  await setDoc(ref, { shareStats: share }, { merge: true });
};