// The hardcoded fallback every booking/request notification has always used.
const DEFAULT_NOTIFICATION_EMAIL = 'Elitebooking.ng@gmail.com';

// Returns every address a booking/request notification should be sent to.
//
// Bug this fixes: the notification target used to be read as a single
// value — localStorage.getItem('elite_notification_email') || DEFAULT —
// but that localStorage key is only ever set on whichever browser/device
// opened Admin > Settings and changed it. A real customer's browser never
// has it set, so every customer booking silently used the hardcoded
// default regardless of what the admin configured elsewhere — meaning a
// custom notification address, once set, was never actually reachable by
// real traffic.
//
// Fix: always send to the hardcoded default AND to the custom address if
// one is configured on the submitting browser and differs from it — so a
// custom address is additive, never a silent replacement.
export function getNotificationEmails(): string[] {
  let custom: string | null = null;
  try {
    custom = typeof localStorage !== 'undefined' ? localStorage.getItem('elite_notification_email') : null;
  } catch {
    // localStorage can throw in some private-browsing contexts — fall back
    // to just the default rather than let a booking submission fail on this.
  }

  const trimmed = custom?.trim();
  const emails = [DEFAULT_NOTIFICATION_EMAIL];
  if (trimmed && trimmed.toLowerCase() !== DEFAULT_NOTIFICATION_EMAIL.toLowerCase()) {
    emails.push(trimmed);
  }
  return emails;
}
