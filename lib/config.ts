// GATE Exam target date — IST (UTC+5:30)
// Feb 1, 2027 at 09:30 AM IST = Feb 1, 2027 04:00:00 UTC
export const GATE_EXAM_DATE = new Date("2027-02-01T04:00:00.000Z");

// IST offset in minutes
export const IST_OFFSET_MINUTES = 330;

/**
 * Get today's date string in IST as "YYYY-MM-DD"
 */
export function getISTDateString(date: Date = new Date()): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return istDate.toISOString().split("T")[0];
}

/**
 * Get start of today in IST as UTC Date
 */
export function getISTMidnightUTC(date: Date = new Date()): Date {
  const istDateStr = getISTDateString(date);
  // IST midnight = UTC time minus 5:30
  return new Date(`${istDateStr}T00:00:00+05:30`);
}
