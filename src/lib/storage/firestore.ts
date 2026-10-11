import * as admin from "firebase-admin";

let _firestore: admin.firestore.Firestore | null = null;

export function getFirestoreInstance(): admin.firestore.Firestore {
  if (!_firestore) {
    if (!admin.apps.length) {
      const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        "notzekenews";

      admin.initializeApp({
        projectId,
      });
    }
    _firestore = admin.firestore();
  }
  return _firestore;
}

export const firestore = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getFirestoreInstance() as any)[prop];
  },
});

/**
 * Helper to strip undefined values from objects before writing to Firestore.
 */
export function sanitizeDoc<T extends Record<string, any>>(doc: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeDoc(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
