// src/utils/user.ts — Legacy compatibility shim (can be removed after full migration)
import { auth } from '../firebase';

export const getUserID = (): string => {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  return user.uid;
};
