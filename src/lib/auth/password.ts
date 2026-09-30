/**
 * Password sign-in rules and messages (2026-09-30: Ralph chose email +
 * password, with Google, over the emailed sign-in link). Shared by the sign-in
 * and sign-up forms. Firebase stores and checks the password; this is only
 * what we ask for, and how we explain what went wrong.
 */

export const PASSWORD_MIN = 8;

/** Why a new password won't do, or null when it's fine. */
export function passwordProblem(pw: string): string | null {
  if (!pw) return "Enter a password.";
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (!/[0-9]/.test(pw)) return "Include at least one number.";
  if (!/[A-Za-z]/.test(pw)) return "Include at least one letter.";
  return null;
}

/** A Firebase Auth error code, in plain words. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email or password isn’t right. Check them, or reset your password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead, or reset your password.";
    case "auth/weak-password":
      return "Choose a stronger password: at least 8 characters, with a letter and a number.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a few minutes, then try again.";
    case "auth/network-request-failed":
      return "Check your internet connection, then try again.";
    case "auth/user-disabled":
      return "This account has been turned off. Contact us if that’s a mistake.";
    default:
      return "That didn’t work. Please try again.";
  }
}
