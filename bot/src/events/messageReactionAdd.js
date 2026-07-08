const { Events, EmbedBuilder } = require('discord.js');
const StarboardConfig = require('../models/StarboardConfig');
const StarboardEntry  = require('../models/StarboardEntry');

const SKULL = '💀';

module.exports = {
  name: Events.MessageReactionAdd,

  async execute(reaction, user, client) {
    // Resolve partials
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
      try { await reaction.message.fetch(); } catch { return; }
    }

    if (user.bot) return;
    if (!reaction.message.guild) return;
    if (reaction.emoji.name !== SKULL) return;

    const guildId = reaction.message.guild.id;

    // Fetch config
    const config = await StarboardConfig.findOne({ guildId }).catch(() => null);
    if (!config) return;

    // Live skull count
    const skullRx = reaction.message.reactions.cache.get(SKULL);
    const count   = skullRx?.count ?? 1;
    if (count < config.minSkulls) return;

    const msg = reaction.message;

    // ── Atomic reservation — prevents race conditions on concurrent reactions ──
    // Attempt to insert a placeholder entry. Only the first concurrent caller wins.
    let isNewPost = false;
    try {
      await StarboardEntry.create({
        guildId,
        originalMessageId:  msg.id,
        starboardMessageId: '__pending__',
      });
      isNewPost = true;
    } catch (err) {
      if (err.code !== 11000) return; // unexpected error — abort

      // Entry already exists — best-effort update the skull count on the starboard post
      const existing = await StarboardEntry.findOne({
        guildId,
        originalMessageId: msg.id,
      }).catch(() => null);

      if (existing && existing.starboardMessageId && existing.starboardMessageId !== '__pending__') {
        try {
          const sbCh = reaction.message.guild.channels.cache.get(config.channelId);
          if (sbCh) {
            const sbMsg = await sbCh.messages.fetch(existing.starboardMessageId).catch(() => null);
            if (sbMsg) {
              await sbMsg.edit({
                content: `💀 **${count} skulls**  ·  Sent by <@${msg.author.id}>`,
              });
            }
          }
        } catch { /* best-effort */ }
      }
      return;
    }

    // ── We hold the reservation — post to starboard ────────────────────────────
    const sbChannel = reaction.message.guild.channels.cache.get(config.channelId);
    if (!sbChannel) {
      // Channel gone — release reservation
      await StarboardEntry.deleteOne({ guildId, originalMessageId: msg.id }).catch(() => {});
      return;
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(0xff47a3)
      .setAuthor({
        name:    msg.member?.displayName ?? msg.author.username,
        iconURL: msg.author.displayAvatarURL({ extension: 'png', size: 64 }),
      })
      .addFields([
        { name: '📍 Channel', value: `<#${msg.channelId}>`,              inline: true },
        { name: '🔗 Source',  value: `[Jump to message](${msg.url})`,    inline: true },
        { name: '💀 Skulls',  value: `**${count}**`,                     inline: true },
      ])
      .setTimestamp(msg.createdAt);

    if (msg.content) embed.setDescription(msg.content.slice(0, 1024));

    // Attach best available media
    const imgAttachment = msg.attachments.find(a => a.contentType?.startsWith('image/'));
    const gifAttachment = msg.attachments.find(a =>
      a.contentType?.startsWith('video/') || a.url?.endsWith('.gif'),
    );

    if (imgAttachment) {
      embed.setImage(imgAttachment.url);
    } else if (msg.stickers?.size) {
      const sticker = msg.stickers.first();
      embed.setImage(
        `https://media.discordapp.net/stickers/${sticker.id}.` +
        `${sticker.format === 2 ? 'apng' : 'png'}`,
      );
    } else if (msg.embeds[0]?.image?.url) {
      embed.setImage(msg.embeds[0].image.url);
    } else if (msg.embeds[0]?.thumbnail?.url) {
      embed.setImage(msg.embeds[0].thumbnail.url);
    }

    // GIF/video — append URL to description so it plays inline
    if (gifAttachment && !imgAttachment) {
      const existing = embed.data.description ?? '';
      embed.setDescription((existing ? existing + '\n\n' : '') + gifAttachment.url);
    }

    try {
      const sent = await sbChannel.send({
        content: `💀 **${count} skulls**  ·  Sent by <@${msg.author.id}>`,
        embeds:  [embed],
      });

      // Update reservation with real message ID
      await StarboardEntry.updateOne(
        { guildId, originalMessageId: msg.id },
        { $set: { starboardMessageId: sent.id } },
      );
    } catch {
      // Posting failed — release reservation so a later reaction can retry
      await StarboardEntry.deleteOne({ guildId, originalMessageId: msg.id }).catch(() => {});
    }
  },
};
