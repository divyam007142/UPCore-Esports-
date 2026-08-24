const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { checkTriggers } = require('../services/triggerService');
const { colors, emojis } = require('../config/config');
const { e } = require('../utils/emoji');
const { formatDuration } = require('../utils/time');
const path = require('path');
const fs   = require('fs');

const SCREENSHOT_EXAMPLE_PATH = path.join(__dirname, '../../assets/screenshot-example.jpg');

const PREFIX = '~';
const PREFIX_COOLDOWN_MS = 8_000;
const prefixCooldowns = new Map();

// ─── Prefix command handlers ──────────────────────────────────────────────────
async function handleDodge(message, mentionStr) {
  return {
    content:
      `${emojis.dodge} Hello ${mentionStr}\n\n` +
      `Please provide **screenshot or video evidence** clearly showing the dodge.\n` +
      `Make sure the evidence clearly describes the proof of dodge.\n\n` +
      `${emojis.warning} **Failure to provide sufficient proof may result in a set reset.**`,
  };
}

async function handleScreenshot(message, mentionStr) {
  const attachment = fs.existsSync(SCREENSHOT_EXAMPLE_PATH)
    ? new AttachmentBuilder(SCREENSHOT_EXAMPLE_PATH, { name: 'screenshot-example.jpg' })
    : null;

  return {
    content:
      `${emojis.screenshot} Hello ${mentionStr}\n\n` +
      `Please send a **screenshot** showing your lobby and timestamp *(Android)*.\n\n` +
      `${emojis.info} If you are on **iOS (iPhone / iPad)**, please **screen record** going from ` +
      `**Brawl Stars** to the **home page**.`,
    ...(attachment ? { files: [attachment] } : {}),
  };
}

async function handleWrongChannel(message, mentionStr) {
  return {
    content:
      `${emojis.wrong} Hello ${mentionStr}\n\n` +
      `You have posted in the **wrong channel**.\n` +
      `Please head to the correct channel for your request and create a new ticket there.\n\n` +
      `${emojis.info} If you need help finding the right channel, ask a staff member.`,
  };
}

const PREFIX_HANDLERS = {
  'dodge':         handleDodge,
  'screenshot':    handleScreenshot,
  'ss':            handleScreenshot,
  'wrong-channel': handleWrongChannel,
};

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ── Prefix commands (~dodge, ~screenshot, ~wrong-channel) ─────────────────
    if (message.content.startsWith(PREFIX)) {
      const parts   = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmdName = parts[0]?.toLowerCase();

      if (cmdName && PREFIX_HANDLERS[cmdName]) {
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        if (adminRoleId && !message.member?.roles.cache.has(adminRoleId)) return;

        // Keep tournament helper commands out of the channel after processing.
        await message.delete().catch(() => {});

        const cooldownKey = `${message.author.id}:${cmdName === 'ss' ? 'screenshot' : cmdName}`;
        const cooldownExpiresAt = prefixCooldowns.get(cooldownKey) || 0;
        if (Date.now() < cooldownExpiresAt) {
          const secondsLeft = Math.max(1, Math.ceil((cooldownExpiresAt - Date.now()) / 1000));
          const cooldownReply = await message.channel.send({
            embeds: [new EmbedBuilder().setDescription(
              `${e('clock')} Please wait **${secondsLeft} seconds** before using this command again.`,
            )],
          }).catch(() => null);
          if (cooldownReply) setTimeout(() => cooldownReply.delete().catch(() => {}), 5_000);
          return;
        }
        prefixCooldowns.set(cooldownKey, Date.now() + PREFIX_COOLDOWN_MS);
        setTimeout(() => prefixCooldowns.delete(cooldownKey), PREFIX_COOLDOWN_MS);

        const mentionedUser = message.mentions.users.first();
        const mentionStr    = mentionedUser ? `<@${mentionedUser.id}>` : (parts[1] || 'Player');

        try {
          const result = await PREFIX_HANDLERS[cmdName](message, mentionStr);
          await message.channel.send(result);
        } catch { }
        return;
      }
    }

    // ── "UPC afk [reason]" text AFK setter ────────────────────────────────────
    if (/^upc\s+afk(\s+|$)/i.test(message.content)) {
      if (client.afkUsers.has(message.author.id)) {
        message.reply({
          embeds: [new EmbedBuilder()
            .setColor(colors.warning)
            .setDescription(`${e('warning')}  You're already AFK. Send any message to clear your status.`)],
        }).catch(() => {});
      } else {
        const reason = message.content.replace(/^upc\s+afk\s*/i, '').trim() || 'No reason provided';
        client.afkUsers.set(message.author.id, { reason, since: new Date() });
        message.reply({
          embeds: [new EmbedBuilder()
            .setColor(colors.neutral)
            .setDescription(`${e('afk')}  You are now AFK, See you later <@${message.author.id}>`)],
        }).catch(() => {});
      }
      return;
    }

    // ── Custom triggers ────────────────────────────────────────────────────────
    await checkTriggers(message, client);

    // ── AFK mention check ──────────────────────────────────────────────────────
    for (const [, mentionedUser] of message.mentions.users) {
      if (client.afkUsers.has(mentionedUser.id)) {
        const afkData = client.afkUsers.get(mentionedUser.id);
        message.reply({
          embeds: [new EmbedBuilder()
            .setColor(colors.neutral)
            .setDescription(
              `${e('afk')}  <@${mentionedUser.id}> is currently AFK  ·  **Reason:** ${afkData.reason}`,
            )],
        }).catch(() => {});
        break;
      }
    }

    // ── AFK return check ───────────────────────────────────────────────────────
    if (client.afkUsers.has(message.author.id)) {
      const afkData = client.afkUsers.get(message.author.id);
      const awayMs  = afkData?.since ? Date.now() - new Date(afkData.since).getTime() : 0;
      const awayStr = awayMs > 0 ? formatDuration(awayMs) : 'a moment';
      client.afkUsers.delete(message.author.id);
      message.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setDescription(
            `${e('check')}  Welcome back <@${message.author.id}>! I have removed your AFK.\n` +
            `${e('clock')}  You were away for ${awayStr}`,
          )],
      }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      }).catch(() => {});
    }
  },
};
