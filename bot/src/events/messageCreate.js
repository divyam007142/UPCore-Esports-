const { Events, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { automodCheck } = require('../services/automodService');
const { checkTriggers } = require('../services/triggerService');
const { colors, emojis } = require('../config/config');
const { e, emojiPartial } = require('../utils/emoji');
const { formatDuration } = require('../utils/time');
const { makeFooter } = require('../utils/embeds');
const path = require('path');
const fs   = require('fs');

const SCREENSHOT_EXAMPLE_PATH = path.join(__dirname, '../../assets/screenshot-example.jpg');

const PREFIX = '~';

// ─── Prefix command handlers ──────────────────────────────────────────────────
async function handleDodge(message, mentionStr) {
  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setAuthor({
      name:    'Tournament Staff — Dodge Report',
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setDescription(
      `${emojis.dodge} Hello ${mentionStr}\n\n` +
      `Please provide **screenshot or video evidence** clearly showing the dodge.\n` +
      `Make sure the evidence clearly describes the proof of dodge.\n\n` +
      `${emojis.warning} **Failure to provide sufficient proof may result in a set reset.**`,
    )
    .setFooter({ text: 'UPCORE Esports • Tournament Staff' })
    .setTimestamp();
}

async function handleScreenshot(message, mentionStr) {
  const attachment = fs.existsSync(SCREENSHOT_EXAMPLE_PATH)
    ? new AttachmentBuilder(SCREENSHOT_EXAMPLE_PATH, { name: 'screenshot-example.jpg' })
    : null;

  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setAuthor({
      name:    'Tournament Staff — Screenshot Required',
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setDescription(
      `${emojis.screenshot} Hello ${mentionStr}\n\n` +
      `Please send a **screenshot** showing your lobby and timestamp *(Android)*.\n\n` +
      `${emojis.info} If you are on **iOS (iPhone / iPad)**, please **screen record** going from ` +
      `**Brawl Stars** to the **home page**.`,
    )
    .setImage(attachment ? 'attachment://screenshot-example.jpg' : null)
    .setFooter({ text: 'UPCORE Esports • Tournament Staff' })
    .setTimestamp();

  return { embed, attachment };
}

async function handleWrongChannel(message, mentionStr) {
  return new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setAuthor({
      name:    'Tournament Staff — Wrong Channel',
      iconURL: message.client.user.displayAvatarURL(),
    })
    .setDescription(
      `${emojis.wrong} Hello ${mentionStr}\n\n` +
      `You have posted in the **wrong channel**.\n` +
      `Please head to the correct channel for your request and create a new ticket there.\n\n` +
      `${emojis.info} If you need help finding the right channel, ask a staff member.`,
    )
    .setFooter({ text: 'UPCORE Esports • Tournament Staff' })
    .setTimestamp();
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

        const mentionedUser = message.mentions.users.first();
        const mentionStr    = mentionedUser ? `<@${mentionedUser.id}>` : (parts[1] || 'Player');

        try {
          const result = await PREFIX_HANDLERS[cmdName](message, mentionStr);
          // handleScreenshot returns { embed, attachment }; others return an embed directly
          if (result && result.embed) {
            const replyOpts = { embeds: [result.embed] };
            if (result.attachment) replyOpts.files = [result.attachment];
            await message.reply(replyOpts);
          } else {
            await message.reply({ embeds: [result] });
          }
        } catch { }
        return;
      }
    }

    // ── "UPC" — Spotify now-playing check ────────────────────────────────────
    if (/^upc$/i.test(message.content.trim())) {
      const member  = message.member;
      const spotify = member?.presence?.activities?.find(a => a.name === 'Spotify');

      if (!spotify) {
        // No song playing — react with exclamation emoji only
        const exEmoji = e('exclaim');
        await message.react(exEmoji || '❗').catch(() => {});
        return;
      }

      // Song is playing — react with music emoji
      const musicEmoji = e('music');
      await message.react(musicEmoji || '🎵').catch(() => {});

      const songName = spotify.details || 'Unknown Song';
      const artist   = (spotify.state || 'Unknown Artist').replace(/;/g, ',');
      const trackId  = spotify.syncId;
      const trackUrl = trackId ? `https://open.spotify.com/track/${trackId}` : null;

      // Album art — largeImage format: "spotify:<albumImageId>"
      const rawImg   = spotify.assets?.largeImage;
      const albumId  = rawImg?.startsWith('spotify:') ? rawImg.slice(8) : null;
      const albumArt = albumId ? `https://i.scdn.co/image/${albumId}` : null;

      // Spotify emoji for embed author & button (from application emojis)
      const spotifyEmoji   = e('spotify');                // full string e.g. <:spotify:123>
      const spotifyPartial = emojiPartial('spotify');     // { id, name } for button
      const musicStr       = musicEmoji || '🎵';

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setAuthor({ name: `${spotifyEmoji ? spotifyEmoji + '  ' : ''}Spotify` })
        .setDescription(
          `${musicStr}  <@${message.author.id}> is listening to ` +
          (trackUrl ? `**[${songName}](${trackUrl})**` : `**${songName}**`) +
          `  by  **${artist}**`
        )
        .setFooter({ text: 'Spotify • Now Playing' })
        .setTimestamp();

      if (albumArt) embed.setThumbnail(albumArt);

      // "Listen on Spotify" link button
      const btn = new ButtonBuilder()
        .setLabel('Listen on Spotify')
        .setStyle(ButtonStyle.Link)
        .setURL(trackUrl || 'https://open.spotify.com');

      if (spotifyPartial) btn.setEmoji(spotifyPartial);
      else                btn.setEmoji({ name: '🎵' });

      const row = new ActionRowBuilder().addComponents(btn);

      await message.reply({ embeds: [embed], components: [row] }).catch(() => {});
      return;
    }

    // ── "UPC afk [reason]" text AFK setter ────────────────────────────────────
    if (/^upc\s+afk(\s+|$)/i.test(message.content)) {
      if (client.afkUsers.has(message.author.id)) {
        message.reply({
          embeds: [new EmbedBuilder()
            .setColor(colors.warning)
            .setDescription(`${e('warning')}  You're already AFK. Send any other message to clear your status.`)],
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

    // ── AutoMod ────────────────────────────────────────────────────────────────
    await automodCheck(message, client);

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
