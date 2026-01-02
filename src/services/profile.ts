import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase";

// 1. Generate a random 6-character code (e.g. "A7X-92B")
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, 1, O, 0 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 2) code += "-"; // Add dash in middle
  }
  return code;
};

// 2. Get (or Create) My Short Code
export const getMyShortCode = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return "";

  const userRef = doc(firestore, "users", user.uid);
  const snapshot = await getDoc(userRef);

  // If code exists, return it
  if (snapshot.exists() && snapshot.data().shortCode) {
    return snapshot.data().shortCode;
  }

  // If not, generate a new one and save it
  const newCode = generateCode();
  
  // Save to Firestore so friends can find me
  await setDoc(userRef, { 
    shortCode: newCode,
    displayName: user.displayName || "Unknown",
    photoURL: user.photoURL,
    email: user.email
  }, { merge: true });

  return newCode;
};

// 3. Find Friend's Long ID using their Short Code
export const findUserByShortCode = async (shortCode: string): Promise<string | null> => {
  const usersRef = collection(firestore, "users");
  const q = query(usersRef, where("shortCode", "==", shortCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  // Return the Long UID of the found user
  return snapshot.docs[0].id;
};