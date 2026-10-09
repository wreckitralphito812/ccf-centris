import "server-only";

import type { Auth } from "firebase-admin/auth";

/**
 * Firebase Admin, for checking ID tokens and minting and verifying the site's
 * session cookies. Needs a service account: FIREBASE_CLIENT_EMAIL and
 * FIREBASE_PRIVATE_KEY (the key's newlines may be written as `\n`, which is how
 * most hosts store multi-line values). The project id is the public one.
 *
 * firebase-admin is loaded on first use, not at import (2026-09-28). Every
 * page that reads `@/lib/queries` pulls this module in through
 * `currentUser()`, and a top-level import meant a firebase-admin that failed to
 * load in production took all of them down with a 500 (/reserve/dgroup,
 * /events, /search, …), accounts configured or not. Now only a request that
 * really checks or mints a session loads it, and `currentUser()` treats a
 * failure as signed out.
 */

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

/**
 * Local end-to-end testing only (2026-10-09): with FIREBASE_AUTH_EMULATOR_HOST
 * set, firebase-admin talks to the Firebase Auth emulator, which needs no
 * service account. Ignored in production builds.
 */
const emulator = process.env.NODE_ENV !== "production" && Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

export function hasFirebase(): boolean {
  return Boolean(projectId && (emulator || (clientEmail && privateKey)));
}

export async function firebaseAdminAuth(): Promise<Auth> {
  if (!projectId || (!emulator && (!clientEmail || !privateKey))) {
    throw new Error("firebaseAdminAuth() called without the Firebase service account settings");
  }
  const [{ cert, getApp, getApps, initializeApp }, { getAuth }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/auth"),
  ]);
  const app = getApps().length
    ? getApp()
    : initializeApp(emulator ? { projectId } : { credential: cert({ projectId, clientEmail: clientEmail!, privateKey: privateKey! }), projectId });
  return getAuth(app);
}
