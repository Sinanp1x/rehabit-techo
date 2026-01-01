// src/utils/user.ts

export const getUserID = () => {
  let id = localStorage.getItem("habit_user_id");
  if (!id) {
    // Generate a simple random ID like "user_a1b2c3"
    id = "user_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("habit_user_id", id);
  }
  return id;
};

export const getFriendID = () => {
  return localStorage.getItem("habit_friend_id");
};

export const setFriendID = (id: string) => {
  localStorage.setItem("habit_friend_id", id.trim());
};