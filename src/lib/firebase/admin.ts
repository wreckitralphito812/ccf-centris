import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Firebase Admin, for checking ID tokens and minting and verifying the site's
 * session cookies. Needs a service account: FIREBASE_CLIENT_EMAIL and
 * FIREBASE_PRIVATE_KEY (the key's newlines may be written as `\n`, which is how
 * most hosts store multi-line values). The project id is the public one.
 */

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function hasFirebase(): boolean {
  return Boolean(projectId && clientEmail && privateKey);
}

export function firebaseAdminAuth(): Auth {
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("firebaseAdminAuth() called without the Firebase service account settings");
  }
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  return getAuth(app);
}
