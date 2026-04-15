/**
 * jj-cal-9ol1: Virtual recurrence helpers.
 *
 * A recurring list item uses a single DB row. Instead of spawning new rows on
 * completion, we treat the item as "incomplete again" once completedAt is older
 * than the interval. The completed boolean is still written normally — the
 * virtual check is layered on top at display time.
 */

import type { RecurrenceInterval } from '$lib/server/db/schema';

export { type RecurrenceInterval };

export const RECURRENCE_INTERVALS: RecurrenceInterval[] = [
	'daily',
	'weekly',
	'fortnightly',
	'monthly'
];

export const INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
	daily: 'Daily',
	weekly: 'Weekly',
	fortnightly: 'Fortnightly',
	monthly: 'Monthly'
};

/** Number of milliseconds for each interval. Monthly uses 30 days. */
const INTERVAL_MS: Record<RecurrenceInterval, number> = {
	daily: 1 * 86_400_000,
	weekly: 7 * 86_400_000,
	fortnightly: 14 * 86_400_000,
	monthly: 30 * 86_400_000
};

/**
 * Returns true if the item should be shown as complete.
 *
 * Non-recurring: mirrors the `completed` boolean directly.
 * Recurring: complete only while completedAt is within the current interval.
 */
export function isEffectivelyComplete(item: {
	completed: boolean;
	completedAt: Date | null;
	recurrenceInterval?: RecurrenceInterval | null;
}): boolean {
	if (!item.recurrenceInterval) return item.completed;
	if (!item.completedAt) return false;
	return Date.now() - item.completedAt.getTime() < INTERVAL_MS[item.recurrenceInterval];
}

/**
 * The date the item is "due again" — completedAt + interval.
 * Returns null for non-recurring items or items never completed.
 */
export function nextDueDate(item: {
	completedAt: Date | null;
	recurrenceInterval?: RecurrenceInterval | null;
}): Date | null {
	if (!item.recurrenceInterval || !item.completedAt) return null;
	return new Date(item.completedAt.getTime() + INTERVAL_MS[item.recurrenceInterval]);
}
