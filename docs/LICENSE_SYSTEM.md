# License Key System Documentation

## Overview

The Rehabi Techo app includes a built-in license verification system to control access to premium features. Users must activate their account with a valid license key to add new habits.

## How It Works

### Client-Side Flow

1. **License Check on Login**
   - When user authenticates, app checks `users/{uid}` document in Firestore
   - If `hasLicense: true`, user has full access
   - If not, user can view existing data but cannot add new habits

2. **License Activation**
   - User enters license key in the LicenseModal
   - Key is validated against `license_keys/{keyCode}` collection
   - If valid and unclaimed, key is marked as claimed and user is granted access

3. **Feature Gating**
   - Add Habit button triggers license check
   - Licensed users → open AddHabitModal
   - Unlicensed users → open LicenseModal

## Firestore Schema

### `users/{uid}` Collection

```typescript
{
  hasLicense: boolean;          // License status
  licenseKey: string;           // The key they used
  email: string;                // User's email
  updatedAt: string;            // ISO timestamp
}
```

### `license_keys/{keyCode}` Collection

```typescript
{
  status: 'unclaimed' | 'claimed';  // Key status
  claimedBy?: string;                // User UID (set when claimed)
  claimedAt?: string;                // ISO timestamp
  createdAt: string;                 // When key was generated
  expiresAt?: string;                // Optional expiration
  notes?: string;                    // Internal notes
}
```

## Generating License Keys

### Option 1: Firebase Console (Manual)

1. Open Firebase Console → Firestore
2. Go to `license_keys` collection
3. Add document manually:
   - **Document ID:** Your key (e.g., "TECH-2024-A1B2")
   - **Fields:**
     ```
     status: "unclaimed"
     createdAt: "2024-01-02T10:00:00Z"
     ```

### Option 2: Firebase Admin SDK (Automated)

Create a Node.js script to batch-generate keys:

```javascript
// generateKeys.js
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Generate random key
function generateKey(prefix = 'TECHO') {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
}

// Generate multiple keys
async function generateKeys(count = 10) {
  const batch = db.batch();
  const keys = [];

  for (let i = 0; i < count; i++) {
    const key = generateKey();
    const keyRef = db.collection('license_keys').doc(key);
    
    batch.set(keyRef, {
      status: 'unclaimed',
      createdAt: new Date().toISOString(),
      notes: `Generated in batch on ${new Date().toLocaleDateString()}`
    });
    
    keys.push(key);
  }

  await batch.commit();
  console.log(`✅ Generated ${count} keys:`);
  keys.forEach(key => console.log(`  ${key}`));
  
  return keys;
}

// Run
generateKeys(10)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
```

**Run the script:**
```bash
npm install firebase-admin
node generateKeys.js
```

### Option 3: Cloud Function (REST API)

Create a protected admin endpoint:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const generateLicenseKeys = functions.https.onCall(async (data, context) => {
  // Verify admin privileges
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can generate keys');
  }

  const count = data.count || 1;
  const prefix = data.prefix || 'TECHO';
  const keys: string[] = [];

  const batch = admin.firestore().batch();

  for (let i = 0; i < count; i++) {
    const key = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const keyRef = admin.firestore().collection('license_keys').doc(key);
    
    batch.set(keyRef, {
      status: 'unclaimed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    keys.push(key);
  }

  await batch.commit();
  return { success: true, keys };
});
```

## Key Formats

Recommended formats for easy readability:

- **Simple:** `TECHO-A1B2C3`
- **Segmented:** `TECHO-2024-XYZ123`
- **Date-based:** `TECHO-20240102-A1B2`
- **Custom:** `REHABI-PREMIUM-XYZ`

**Rules:**
- Use uppercase for consistency
- Avoid confusing characters (0/O, 1/I/l)
- Keep it short (16 chars max)
- Use hyphens for readability

## Security Considerations

### Firestore Security Rules

Ensure proper rules are in place:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // License keys - users can read/update, but not create or delete
    match /license_keys/{keyId} {
      // Users can check if a key exists
      allow read: if request.auth != null;
      
      // Users can only update status to 'claimed' with their UID
      allow update: if request.auth != null 
        && request.resource.data.status == 'claimed'
        && request.resource.data.claimedBy == request.auth.uid
        && resource.data.status == 'unclaimed';
      
      // Only admins can create/delete (handled server-side)
      allow create, delete: if false;
    }
    
    // User documents
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Best Practices

1. **Key Generation**
   - Use cryptographically secure random generation
   - Don't expose generation logic client-side
   - Log all key generation with timestamps

2. **Key Distribution**
   - Never commit keys to version control
   - Use secure channels (email, encrypted files)
   - Track which keys were given to whom

3. **Key Validation**
   - Use Firestore transactions to prevent race conditions
   - Check expiration dates server-side
   - Rate limit validation attempts

4. **Monitoring**
   - Track successful activations
   - Alert on suspicious activity (many failed attempts)
   - Regularly audit unclaimed keys

## Admin Interface (Optional)

For easier key management, create an admin dashboard:

```typescript
// AdminPage.tsx (restricted to admin users)
export const AdminPage = () => {
  const [keys, setKeys] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generateNewKeys = async (count: number) => {
    setGenerating(true);
    // Call your Cloud Function or Admin API
    const result = await functions.httpsCallable('generateLicenseKeys')({ count });
    setKeys([...keys, ...result.data.keys]);
    setGenerating(false);
  };

  return (
    <div>
      <h1>License Key Admin</h1>
      <button onClick={() => generateNewKeys(10)}>
        Generate 10 Keys
      </button>
      
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Status</th>
            <th>Claimed By</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(key => (
            <tr key={key.id}>
              <td>{key.id}</td>
              <td>{key.status}</td>
              <td>{key.claimedBy || '-'}</td>
              <td>{key.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Migration from Legacy System

If you have an existing license system:

1. **Export existing keys** to CSV
2. **Bulk import** to Firestore using Admin SDK
3. **Migrate user statuses** by checking old system
4. **Update client code** to use new validation

## Troubleshooting

### "Invalid Key" errors
- Check key format (uppercase, correct length)
- Verify key exists in Firestore
- Check Firestore rules allow read access

### "Key already used" errors
- Key was claimed by another user
- Generate new keys and distribute

### Transaction failures
- Multiple users trying same key simultaneously
- System handled correctly - only one succeeds
- Provide better error message to users

## Alternative Approaches

### 1. Subscription-Based (Recommended for Production)

Replace one-time keys with Stripe/RevenueCat subscriptions:
- Monthly/yearly billing
- Automatic renewal
- Better revenue model

### 2. Trial Period

Give all users 7-day free trial:
```typescript
const isTrialActive = () => {
  const signupDate = new Date(user.metadata.creationTime);
  const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceSignup < 7;
};
```

### 3. Feature-Based Licensing

Instead of binary licensed/unlicensed:
```typescript
{
  tier: 'free' | 'basic' | 'premium';
  maxHabits: number;
  features: string[]; // ['export', 'social', 'analytics']
}
```

## Support

For issues with license system:
- Check Firebase Console logs
- Verify Firestore rules
- Test with fresh account
- Contact support@rehabi.app

---

**Last Updated:** January 2026
