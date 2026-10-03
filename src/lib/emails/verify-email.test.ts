import assert from "node:assert/strict";
import test from "node:test";

import { onOurDomain, verifyEmail } from "./verify-email";

const FIREBASE =
  "https://ccf-centris-4ad56.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=AbC123&apiKey=AIzaKey&continueUrl=https%3A%2F%2Fccfcentris.org.ph%2Fsign-in%3Fverified%3D1&lang=en";

test("the action link moves to our domain and keeps every parameter", () => {
  const ours = new URL(onOurDomain(FIREBASE, "https://ccfcentris.org.ph"));
  assert.equal(ours.host, "ccfcentris.org.ph");
  assert.equal(ours.pathname, "/__/auth/action");
  assert.equal(ours.searchParams.get("mode"), "verifyEmail");
  assert.equal(ours.searchParams.get("oobCode"), "AbC123");
  assert.equal(ours.searchParams.get("apiKey"), "AIzaKey");
  assert.equal(ours.searchParams.get("continueUrl"), "https://ccfcentris.org.ph/sign-in?verified=1");
});

test("local development keeps its own origin and scheme", () => {
  assert.equal(
    new URL(onOurDomain(FIREBASE, "http://localhost:3000")).origin,
    "http://localhost:3000",
  );
});

test("anything that isn't a Firebase action link comes back untouched", () => {
  assert.equal(onOurDomain("https://example.com/other", "https://ccfcentris.org.ph"), "https://example.com/other");
  assert.equal(onOurDomain("not a url", "https://ccfcentris.org.ph"), "not a url");
});

test("the email greets by first name, links the button, and escapes the link", () => {
  const link = onOurDomain(FIREBASE, "https://ccfcentris.org.ph");
  const e = verifyEmail({ origin: "https://ccfcentris.org.ph", firstName: "Ralph", link });
  assert.match(e.html, /Welcome, Ralph\./);
  assert.match(e.html, /href="https:\/\/ccfcentris\.org\.ph\/__\/auth\/action\?mode=verifyEmail&amp;oobCode=AbC123/);
  assert.ok(!e.html.includes("firebaseapp.com"));
  assert.match(e.text, /Confirm my email: https:\/\/ccfcentris\.org\.ph\/__\/auth\/action/);
  assert.match(verifyEmail({ origin: "https://x", firstName: null, link }).html, /Welcome to CCF Centris\./);
});
