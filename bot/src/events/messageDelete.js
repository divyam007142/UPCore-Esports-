const { Events, AuditLogEvent } = require('discord.js');
const { logMessage } = require('../services/logService');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author?.bot) return;

    // Store for snipe command
    client.sniped.set(message.channelId, {
      content:      message.content || null,
      author:       message.author?.tag || 'Unknown',
      authorId:     message.author?.id || null,
      authorAvatar: message.author?.displayAvatarURL({ dynamic: true }) || null,
      timestamp:    new Date(),
      attachments:  message.attachments.map(a => ({
        url: a.url,
        name: a.name || 'attachment',
        contentType: a.contentType || null,
      })),
    });

    setTimeout(() => {
      const entry = client.sniped.get(message.channelId);
      if (entry && entry.timestamp <= new Date(Date.now() - 5 * 60 * 1000)) {
        client.sniped.delete(message.channelId);
      }
    }, 5 * 60 * 1000);

    // ── Try to find who deleted the message via audit log ─────────────────────
    let deletedBy    = null;
    let deletedById  = null;
    try {
      await new Promise(r => setTimeout(r, 500)); // brief wait for audit log to populate
      const logs  = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 3 });
      const entry = logs.entries.find(e =>
        e.target?.id === message.author?.id &&
        e.extra?.channel?.id === message.channelId &&
        (Date.now() - e.createdTimestamp) < 10_000,
      );
      if (entry) {
        deletedBy   = entry.executor?.tag   || null;
        deletedById = entry.executor?.id    || null;
      }
    } catch { /* ViewAuditLog not granted */ }

    await logMessage(client, message.guild, 'delete', {
      author:       message.author?.tag  || 'Unknown',
      authorId:     message.author?.id   || 'Unknown',
      authorAvatar: message.author?.displayAvatarURL({ dynamic: true }) || null,
      channelId:    message.channelId,
      content:      message.content,
      attachments:  message.attachments.size > 0
        ? message.attachments.map(a => ({
          url: a.url,
          name: a.name || 'attachment',
          contentType: a.contentType || null,
        }))
        : [],
      deletedBy,
      deletedById,
    });
  },
};
