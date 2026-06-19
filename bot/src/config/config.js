/**
 * EMOJI NAME MAP
 * --------------
 * Left side  = semantic key used throughout the bot  (do NOT change)
 * Right side = exact emoji name as uploaded to Discord developer portal
 *
 * To update: change the right-hand values to match your uploaded emoji names.
 * Run /ping after restarting to confirm emojis are loading correctly.
 */
// ─── Emoji Name Map ────────────────────────────────────────────────────────────
// Defined in emojiNames.js to avoid circular dependency with emoji.js.
const { EMOJI_NAMES } = require('./emojiNames');

// Lazy proxy — evaluated at call time, NOT at require() time.
// This means emojis are always resolved from the live cache after loadEmojis().
const { e } = require('../utils/emoji');
const emojis = new Proxy(EMOJI_NAMES, {
  get(target, prop) {
    if (typeof prop !== 'string' || !(prop in target)) return '';
    return e(target[prop]);
  },
});

module.exports = {
  token:              process.env.DISCORD_BOT_TOKEN,
  clientId:           process.env.CLIENT_ID,
  guildId:            process.env.GUILD_ID,
  mongoUri:           process.env.MONGODB_URI,
  adminRoleId:        process.env.ADMIN_ROLE_ID,
  welcomeChannelId:   process.env.WELCOME_CHANNEL_ID,
  welcomeLogChannelId: process.env.WELCOME_LOG_CHANNEL_ID,
  logsChannelId:      process.env.LOGS_CHANNEL_ID,
  timezone:           'Asia/Kolkata',
  colors: {
    primary:    0x00D4FF,
    success:    0x2ECC71,
    error:      0xE74C3C,
    warning:    0xF39C12,
    info:       0x3498DB,
    moderation: 0xFF6B35,
    neutral:    0x2F3136,
    purple:     0x9B59B6,
    gold:       0xF1C40F,
  },
  emojis,
  EMOJI_NAMES,
  cooldowns: {
    default:    3000,
    moderation: 5000,
    info:       2000,
    bulk:       10000,
  },
  automod: {
    scamLinks: [
      'discord-nitro', 'free-nitro', 'discordgift', 'steamgift', 'freegift',
      'bit.ly', 'tinyurl', 'grabify', 'discord.gift.', 'discordapp.com.ru',
      'discord-app.com', 'discrord', 'discordl', '1800flowers', 'dlscord',
    ],
    maxMentions:   5,
    spamThreshold: 5,
    spamInterval:  5000,
    badWords: ['nigger', 'faggot', 'retard', 'chink', 'spic'],
  },
};
