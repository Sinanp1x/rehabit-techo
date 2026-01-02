// src/utils/user.ts
import { auth } from '../firebase';

export const getUserID = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user. Please log in.');
  }
  return user.uid;
};

export const getFriendID = () => {
  return localStorage.getItem("habit_friend_id");
};

export const setFriendID = (id: string) => {
  localStorage.setItem("habit_friend_id", id.trim());
};