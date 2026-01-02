import { doc, getDoc, runTransaction } from "firebase/firestore";
import { firestore, auth } from "../firebase";

// 1. Check if the current user is already verified
export const checkUserLicense = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const userRef = doc(firestore, "users", user.uid);
    const snapshot = await getDoc(userRef);

    // If user doc exists AND hasLicense is true
    if (snapshot.exists() && snapshot.data().hasLicense) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking license:", error);
    return false;
  }
};

// 2. Try to use a key
export const redeemLicense = async (keyInput: string): Promise<{ success: boolean; message: string }> => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: "No user logged in." };

  const cleanKey = keyInput.trim().toUpperCase();
  
  // References
  const keyRef = doc(firestore, "license_keys", cleanKey);
  const userRef = doc(firestore, "users", user.uid);

  try {
    await runTransaction(firestore, async (transaction) => {
      const keyDoc = await transaction.get(keyRef);

      // Check if key exists
      if (!keyDoc.exists()) {
        throw "Invalid Key.";
      }

      // Check if already used
      if (keyDoc.data().status === 'claimed') {
        throw "Key already used.";
      }

      // 1. Update Key to 'claimed'
      transaction.update(keyRef, {
        status: 'claimed',
        claimedBy: user.uid,
        claimedAt: new Date().toISOString()
      });

      // 2. Mark User as licensed
      transaction.set(userRef, { 
        hasLicense: true,
        licenseKey: cleanKey,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    return { success: true, message: "Welcome to Techo." };

  } catch (e: any) {
    console.error(e);
    return { success: false, message: typeof e === 'string' ? e : "Error activating license." };
  }
};