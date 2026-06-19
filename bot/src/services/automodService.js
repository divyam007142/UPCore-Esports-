const { logAutomod } = require('./logService');
const { colors } = require('../config/config');
const { EmbedBuilder } = require('discord.js');

const spamTracker = new Map();

const SCAM_PATTERNS = [
  /discord[-.]?nitro[-.]?(free|gift|claim)/i,
  /free[-.]?nitro/i,
  /steam[-.]?gift/i,
  /bit\.ly\/[a-z0-9]+/i,
  /tinyurl\.com/i,
  /grabify\.link/i,
  /discord\.gift\./i,
  /discordapp\.com\.[a-z]{2,}/i,
  /discord-app\.com/i,
  /discrord\./i,
  /discordl\./i,
  /dlscord\./i,
  /1800flowers/i,
  /@everyone.{0,50}(free|nitro|gift|click)/i,
];

const NSFW_PATTERNS = [
  /\b(porn|xxx|nsfw|hentai|onlyfans|nude|naked)\b/i,
];

const BAD_WORDS = [
  'nigger', 'faggot', 'retard', 'chink', 'spic',
];

async function automodCheck(message, client) {
  if (!message.guild || message.author.bot) return;

  const adminRoleId = process.env.ADMIN_ROLE_ID;
  const member = message.member;
  if (!member) return;

  // Admins bypass automod
  if (member.roles.cache.has(adminRoleId)) return;

  const content = message.content;
  const userId = message.author.id;

  // Check scam links
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(content)) {
      await handleViolation(message, client, 'Scam/Malicious Link Detected', content);
      return;
    }
  }

  // Check NSFW
  for (const pattern of NSFW_PATTERNS) {
    if (pattern.test(content)) {
      await handleViolation(message, client, 'NSFW Content Detected', content);
      return;
    }
  }

  // Check bad words
  for (const word of BAD_WORDS) {
    if (content.toLowerCase().includes(word)) {
      await handleViolation(message, client, 'Prohibited Word Detected', content);
      return;
    }
  }

  // Check mass mentions
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount >= 5) {
    await handleViolation(message, client, `Mass Mentions (${mentionCount} mentions)`, content);
    return;
  }

  // Check spam (5 messages in 5 seconds)
  if (!spamTracker.has(userId)) {
    spamTracker.set(userId, []);
  }
  const timestamps = spamTracker.get(userId);
  const now = Date.now();
  const filtered = timestamps.filter(t => now - t < 5000);
  filtered.push(now);
  spamTracker.set(userId, filtered);

  if (filtered.length >= 5) {
    await handleViolation(message, client, 'Spam Detected', content);
    spamTracker.set(userId, []);
    return;
  }
}

async function handleViolation(message, client, reason, content) {
  try {
    await message.delete();
  } catch { }

  const embed = new EmbedBuilder()
    .setColor(colors.error)
    .setTitle('AutoMod — Message Blocked')
    .setDescription(`Your message was removed for: **${reason}**`)
    .setFooter({ text: 'UPCORE Esports Bot' })
    .setTimestamp();

  try {
    await message.author.send({ embeds: [embed] });
  } catch { }

  await logAutomod(client, message.guild, {
    user: message.author.tag,
    userId: message.author.id,
    channelId: message.channelId,
    reason,
    content,
  });
}

module.exports = { automodCheck };
