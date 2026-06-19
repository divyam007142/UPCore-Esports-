/**
 * In-memory store for active lockdown timers.
 * Key  : channelId (string)
 * Value: { timeout, endsAt (ms epoch), lockedBy (user id) }
 *
 * Both lockdown-start and lockdown-end share this Map so end can cancel
 * the timer and unlock the channel early.
 */
const lockdownTimers = new Map();

module.exports = lockdownTimers;
