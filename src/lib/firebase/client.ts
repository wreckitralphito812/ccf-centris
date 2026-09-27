"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from "firebase/auth";

/**
 * Firebase Auth in the browser. It only proves who someone is: once Firebase
 * signs a member in, their ID token goes to the server (`startSession`), which
 * sets the site's own session cookie. The browser keeps no Firebase session of
 * its own (in-memory persistence), so signing out of the site is one cookie.
 *
 * The config is public by design; it identifies the Firebase project, it
 * doesn't grant anything.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const FIREBASE_CONFIGURED = Boolean(config.apiKey && config.authDomain && config.projectId);

/**
 * The email-link flow needs the address again when the link is opened, and
 * carries the optional phone through to the first sign-in. Kept in this
 * browser only; a link opened on another device asks for the email again.
 */
const PENDING_KEY = "ccf.pendingSignIn";

export interface PendingSignIn {
  email: string;
  phone: string | null;
}

export function savePendingSignIn(p: PendingSignIn): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    // Private mode or storage blocked: the finish page asks for the email.
  }
}

export function readPendingSignIn(): PendingSignIn | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as PendingSignIn | null;
    return p && typeof p.email === "string" ? p : null;
  } catch {
    return null;
  }
}

export function clearPendingSignIn(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
}

let auth: Promise<Auth> | null = null;

export function firebaseAuth(): Promise<Auth> {
  auth ??= (async () => {
    const app = getApps().length ? getApp() : initializeApp(config);
    const a = getAuth(app);
    await setPersistence(a, inMemoryPersistence);
    return a;
  })();
  return auth;
}
