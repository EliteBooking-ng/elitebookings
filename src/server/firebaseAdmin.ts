import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;
let adminDbInstance: Firestore | null = null;

// Lazily initialized, and allowed to throw — callers (Discovery) must catch
// and fall back to static-only search when FIREBASE_SERVICE_ACCOUNT_JSON
// hasn't been configured yet, rather than crashing the whole request.
export function getAdminDb(): Firestore {
  if (adminDbInstance) return adminDbInstance;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing.');
  }

  if (!adminApp) {
    adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
  }

  // Same named (non-default) Firestore database used by the client SDK in
  // src/firebase.ts, so admin reads see the exact same data.
  adminDbInstance = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  return adminDbInstance;
}
