/**
 * Application Emoji Cache
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches all emojis uploaded to the Discord Application and caches them.
 *
 * Usage:
 *   const { e } = require('../utils/emoji');
 *   e('ban')  → resolves 'ban' → EMOJI_NAMES.ban → Discord name → cached string
 *   e('ban')  → '<:187302ban:123456789>'  or  '' (never Unicode)
 *
 * The cache is populated once in the ready event via loadEmojis().
 */

const { EMOJI_NAMES } = require('../config/emojiNames');

const _cache = new Map();

/**
 * Loads all application emojis from the Discord API into the cache.
 * @param {import('discord.js').Client} client
 * @returns {Promise<number>} number of emojis loaded
 */
async function loadEmojis(client) {
  try {
    const fetched = await client.application.emojis.fetch();
    _cache.clear();
    fetched.forEach(emoji => {
      _cache.set(emoji.name, emoji.toString());
    });
    return _cache.size;
  } catch (err) {
    console.error('[Emoji] Failed to load application emojis:', err.message);
    return 0;
  }
}

/**
 * Resolve a semantic key (e.g. 'ban') or a raw Discord name (e.g. '187302ban')
 * to the cached application emoji string.
 * Always returns '' if not found — never falls back to Unicode.
 *
 * @param {string} name  Semantic key from EMOJI_NAMES, or a raw Discord upload name
 * @returns {string}
 */
function e(name) {
  if (!name) return '';
  // 1. Try semantic key → Discord name → cache
  const discordName = EMOJI_NAMES[name];
  if (discordName) return _cache.get(discordName) ?? '';
  // 2. Fall back to direct Discord name lookup (raw upload name)
  return _cache.get(name) ?? '';
}

/**
 * Returns a partial emoji object { id, name } suitable for Discord component
 * options (e.g. select menu options). Accepts both semantic and raw Discord names.
 * Returns undefined if not found.
 *
 * @param {string} name  Semantic key or raw Discord upload name
 * @returns {{ id: string, name: string } | undefined}
 */
function emojiPartial(name) {
  if (!name) return undefined;
  const discordName = EMOJI_NAMES[name] ?? name;
  const str = _cache.get(discordName);
  if (!str) return undefined;
  const match = str.match(/<a?:([^:]+):(\d+)>/);
  if (!match) return undefined;
  return { id: match[2], name: match[1] };
}

/**
 * Returns all loaded Discord emoji names (for debug/startup log).
 * @returns {string[]}
 */
function loadedNames() {
  return [..._cache.keys()];
}

/**
 * Returns whether any emojis have been loaded.
 */
function isReady() {
  return _cache.size > 0;
}

module.exports = { loadEmojis, e, emojiPartial, loadedNames, isReady };
