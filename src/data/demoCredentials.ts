/**
 * Demo sign-in passwords.
 *
 * These ship in the client bundle, so they are **not** a security boundary —
 * anyone can read them in the built JS. They exist so the login form behaves like
 * a login form: wrong credentials get refused, which is the behaviour the rest of
 * the app is built against.
 *
 * Kept out of `store.tsx` on purpose. A password is not application state, and
 * when real authentication arrives this file and `signInWithCredentials` are the
 * only two things that need replacing.
 */

const DEMO_PASSWORDS: Record<string, string> = {
  'staff-1': 'partner2026',
  'staff-2': 'consultant2026',
  'staff-3': 'assistant2026',
}

export function demoPasswordFor(id: string): string {
  return DEMO_PASSWORDS[id] ?? 'client2026'
}

/** Whether a staff or client id + password pair matches. The only check in the demo. */
export function demoPasswordMatches(id: string, password: string): boolean {
  const expected = DEMO_PASSWORDS[id] ?? 'client2026'
  return !!expected && expected === password
}
