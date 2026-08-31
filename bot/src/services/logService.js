const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const CommandLog = require('../models/CommandLog');
const { colors } = require('../config/config');
const { e } = require('../utils/emoji');
const { formatIST } = require('../utils/time');
const { makeFooter } = require('../utils/embeds');
const { generatePurgeTranscript } = require('../utils/transcript');

function isImageAttachment(attachment) {
  const url = typeof attachment === 'string' ? attachment : attachment?.url;
  const name = typeof attachment === 'string' ? '' : attachment?.name || '';
  const type = typeof attachment === 'string' ? '' : attachment?.contentType || '';
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|avif)(?:$|[?#])/i.test(`${name} ${url}`);
}

function isVideoAttachment(attachment) {
  const url = typeof attachment === 'string' ? attachment : attachment?.url;
  const name = typeof attachment === 'string' ? '' : attachment?.name || '';
  const type = typeof attachment === 'string' ? '' : attachment?.contentType || '';
  return type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i.test(`${name} ${url}`);
}

function attachmentUrl(attachment) {
  return typeof attachment === 'string' ? attachment : attachment?.url;
}

async function fetchLogMedia(attachment, index) {
  const url = attachmentUrl(attachment);
  if (!url || (!isImageAttachment(attachment) && !isVideoAttachment(attachment))) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'UPCORE-Esports-Log/1.0' },
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) return null;

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 8 * 1024 * 1024) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) return null;

    const originalName = typeof attachment === 'string' ? '' : attachment.name || '';
    const extension = contentType.split('/')[1] || originalName.split('.').pop() || (isVideo ? 'mp4' : 'png');
    const safeName = originalName.replace(/[^a-z0-9._-]/gi, '_') || `deleted-media-${index + 1}.${extension}`;
    return { buffer, name: `${index + 1}-${safeName}` };
  } catch {
    return null;
  }
}

async function getConfig(guildId) {
  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId });
  return config;
}

async function sendLog(client, guildId, logType, embed, files = [], { fallback = true } = {}) {
  try {
    const config    = await getConfig(guildId);
    const channelId = config.logging[logType] || (fallback ? process.env.LOGS_CHANNEL_ID : null);
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;
    const embeds = Array.isArray(embed) ? embed : [embed];
    await channel.send({ embeds, ...(files.length ? { files } : {}) });
  } catch { }
}

function getActionMeta(action) {
  const META = {
    BAN:          { emoji: e('ban'),        color: colors.error,      label: 'Ban' },
    UNBAN:        { emoji: e('unban'),      color: colors.success,    label: 'Unban' },
    KICK:         { emoji: e('kick'),       color: colors.moderation, label: 'Kick' },
    MUTE:         { emoji: e('mute'),       color: colors.moderation, label: 'Mute' },
    UNMUTE:       { emoji: e('unmute'),     color: colors.success,    label: 'Unmute' },
    WARN:         { emoji: e('warn'),       color: colors.warning,    label: 'Warn' },
    UNWARN:       { emoji: e('success'),    color: colors.success,    label: 'Unwarn' },
    VC_MUTE:      { emoji: e('voice'),      color: colors.moderation, label: 'VC Mute' },
    VC_UNMUTE:    { emoji: e('voice'),      color: colors.success,    label: 'VC Unmute' },
    VC_DEAFEN:    { emoji: e('voice'),      color: colors.moderation, label: 'VC Deafen' },
    VC_UNDEAFEN:  { emoji: e('voice'),      color: colors.success,    label: 'VC Undeafen' },
    VC_KICK:      { emoji: e('kick'),       color: colors.error,      label: 'VC Kick' },
    VC_MOVE:      { emoji: e('voice'),      color: colors.info,       label: 'VC Move' },
    NICK:         { emoji: e('nick'),       color: colors.info,       label: 'Nickname Change' },
  };
  return META[action] || { emoji: e('mod'), color: colors.moderation, label: action };
}

// ─── Moderation Log ────────────────────────────────────────────────────────────
async function logModAction(client, guild, data) {
  const meta = getActionMeta(data.action);

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${meta.label} — Action Completed`)
    .setAuthor({ name: data.target, iconURL: data.targetAvatar || undefined })
    .addFields(
      { name: `${e('member')} Target`,    value: `<@${data.targetId}>\n\`${data.target}\`\n\`${data.targetId}\``,       inline: true },
      { name: `${e('mod')} Moderator`,   value: `<@${data.moderatorId}>\n\`${data.moderator}\``,                        inline: true },
      { name: `${e('server')} Server`,   value: `${guild.name}\n\`${guild.id}\``,                                       inline: true },
      { name: `${e('info')} Action`,     value: `\`${data.action}\`\n${meta.label}`,                                   inline: true },
      { name: `${e('log')} Reason`,      value: data.reason || 'No reason provided',                                     inline: false },
    );

  if (data.targetAvatar) embed.setThumbnail(data.targetAvatar);
  if (data.duration)     embed.addFields({ name: `${e('clock')} Duration`,   value: `\`${data.duration}\``,        inline: true });
  if (data.channel)      embed.addFields({ name: `${e('voice')} VC Channel`, value: `<#${data.channel}>`,          inline: true });

  embed.addFields(
    { name: `${e('case')} Case ID`,       value: `\`#${data.caseId}\``,                                             inline: true },
    { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,          inline: true },
  );

  embed.setFooter(makeFooter(client, `Case #${data.caseId}`)).setTimestamp();
  await sendLog(client, guild.id, 'moderationLogs', embed);
}

// ─── Message Delete Log ────────────────────────────────────────────────────────
async function logMessageDelete(client, guild, data) {
  const mediaAttachments = (data.attachments || []).filter(
    attachment => isImageAttachment(attachment) || isVideoAttachment(attachment),
  );
  const mediaResults = await Promise.all(
    mediaAttachments.slice(0, 3).map((attachment, index) => fetchLogMedia(attachment, index)),
  );
  const media = mediaResults.filter(Boolean);
  const hasEmbed = data.message?.embeds?.length > 0;

  const embed = new EmbedBuilder()
    .setColor(colors.error)
    .setTitle(`${e('purge')} Message Deleted`)
    .setAuthor({ name: data.author, iconURL: data.authorAvatar || undefined })
    .addFields(
      { name: `${e('member')} Message Author`, value: `<@${data.authorId}>\n\`${data.author}\`\n\`${data.authorId}\``, inline: true },
      { name: `${e('channel')} Channel`,       value: `<#${data.channelId}>`,                                           inline: true },
      { name: `${e('calendar')} Deleted At`,   value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,         inline: true },
    );

  if (data.deletedBy) {
    embed.addFields({
      name:  `${e('mod')} Deleted By`,
      value: data.deletedById
        ? `<@${data.deletedById}>\n\`${data.deletedBy}\`\n\`${data.deletedById}\``
        : `\`${data.deletedBy}\``,
      inline: true,
    });
  }

  embed.addFields({
    name:  `${e('log')} Message Content`,
    value: data.content
      ? `\`\`\`${data.content.slice(0, 950)}\`\`\``
      : hasEmbed
        ? '`[Embed content is attached as an HTML transcript]`'
        : '`[No text content — possibly an attachment]`',
    inline: false,
  });

  if (data.attachments?.length) {
    const firstMedia = media[0];
    if (firstMedia && isImageAttachment(mediaAttachments[0])) {
      embed.setImage(`attachment://${firstMedia.name}`);
    }

    const attachmentLines = data.attachments.slice(0, 5).map((attachment, index) => {
      const url = attachmentUrl(attachment);
      const name = typeof attachment === 'string' ? `Attachment ${index + 1}` : attachment.name || `Attachment ${index + 1}`;
      return `[${name}](${url})`;
    });

    embed.addFields({
      name:  `${e('screenshot')} Attachments (${data.attachments.length})`,
      value: attachmentLines.join('\n').slice(0, 1024),
      inline: false,
    });
  }

  embed.setFooter(makeFooter(client, 'Message Log')).setTimestamp();

  const files = media.map(({ buffer, name }) => ({ attachment: buffer, name }));
  if (hasEmbed) {
    try {
      const report = await generatePurgeTranscript(guild, [data.message], {
        channelId: data.channelId,
        count: 1,
        moderator: data.deletedBy || 'Unknown',
        moderatorId: data.deletedById || '',
        reportType: 'embed-delete',
      });
      files.push({ attachment: report, name: 'deleted-embed.html' });
    } catch { /* Keep the existing message log if transcript generation fails. */ }
  }

  await sendLog(client, guild.id, 'messageLogs', embed, files);
}

// ─── Message Edit Log ──────────────────────────────────────────────────────────
async function logMessageEdit(client, guild, data) {
  const embed = new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle(`${e('warning')} Message Edited`)
    .setAuthor({ name: data.author, iconURL: data.authorAvatar || undefined })
    .addFields(
      { name: `${e('member')} Author`,      value: `<@${data.authorId}>\n\`${data.author}\`\n\`${data.authorId}\``,    inline: true },
      { name: `${e('channel')} Channel`,    value: `<#${data.channelId}>`,                                              inline: true },
      { name: `${e('calendar')} Edited At`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,            inline: true },
      { name: `${e('cross')} Before`,       value: `\`\`\`${(data.before || 'Unknown').slice(0, 512)}\`\`\``,           inline: false },
      { name: `${e('check')} After`,        value: `\`\`\`${(data.after  || 'Unknown').slice(0, 512)}\`\`\``,           inline: false },
    );

  if (data.messageLink) {
    embed.addFields({ name: `${e('link')} Jump to Message`, value: `[Click here](${data.messageLink})`, inline: true });
  }

  embed.setFooter(makeFooter(client, 'Message Log')).setTimestamp();
  await sendLog(client, guild.id, 'messageLogs', embed);
}

// ─── Combined message log dispatcher ──────────────────────────────────────────
async function logMessage(client, guild, type, data) {
  if (type === 'delete') return logMessageDelete(client, guild, data);
  if (type === 'edit')   return logMessageEdit(client, guild, data);
}

// ─── Welcome Log ──────────────────────────────────────────────────────────────
async function logWelcome(client, guild, member, data) {
  const accountCreated = Math.floor(member.user.createdAt.getTime() / 1000);
  const joinedAt       = Math.floor(Date.now() / 1000);
  const avatarURL      = member.user.displayAvatarURL({ size: 256 });

  const embed = new EmbedBuilder()
    .setColor(colors.success)
    .setTitle(`${e('welcome')} Member Joined`)
    .setAuthor({ name: member.user.username, iconURL: avatarURL })
    .setThumbnail(avatarURL)
    .addFields(
      { name: `${e('member')} User`,          value: `<@${member.id}>\n\`${member.user.username}\`\n\`${member.id}\``, inline: true },
      { name: `${e('server')} Guild`,          value: `${guild.name}\n\`${guild.id}\``,                                 inline: true },
      { name: `${e('star')} Member Count`,     value: `\`#${guild.memberCount}\``,                                      inline: true },
      { name: `${e('calendar')} Joined At`,    value: `<t:${joinedAt}:F>\n<t:${joinedAt}:R>`,                           inline: true },
      { name: `${e('clock')} Account Created`, value: `<t:${accountCreated}:F>\n${data.accountAge}`,                    inline: true },
      { name: `${e('link')} Invite Used`,      value: data.inviteCode
        ? `Code: \`${data.inviteCode}\`\nInvited by: ${data.inviter || 'Unknown'}`
        : 'Could not determine invite',
        inline: true,
      },
    )
    .setFooter(makeFooter(client, 'Welcome Log'))
    .setTimestamp();

  await sendLog(client, guild.id, 'welcomeLogs', embed);
}

// ─── Voice Log ────────────────────────────────────────────────────────────────
function formatDuration(ms) {
  if (!Number.isFinite(ms)) return 'Not available';

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes || hours) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

async function logVoice(client, guild, data) {
  const COLOR_MAP = {
    'Joined':             colors.success,
    'Left':               colors.error,
    'Moved':              colors.info,
    'Server Muted':       colors.moderation,
    'Server Unmuted':     colors.success,
    'Server Deafened':   colors.moderation,
    'Server Undeafened': colors.success,
    'Screen Share Started': colors.info,
    'Screen Share Stopped': colors.warning,
    'Camera Enabled':       colors.success,
    'Camera Disabled':      colors.warning,
  };

  const channelValue = data.channelId
    ? `${data.channel || 'Unknown'}\n<#${data.channelId}>\n\`${data.channelId}\``
    : (data.channel || 'N/A');
  const movementValue = data.from || data.to
    ? `From: ${data.from || 'N/A'}${data.fromId ? `\n\`${data.fromId}\`` : ''}\nTo: ${data.to || 'N/A'}${data.toId ? `\n\`${data.toId}\`` : ''}`
    : null;
  const stateValue = [
    `Self mute: ${data.selfMute ? 'Yes' : 'No'}`,
    `Self deaf: ${data.selfDeaf ? 'Yes' : 'No'}`,
    `Server mute: ${data.serverMute ? 'Yes' : 'No'}`,
    `Server deaf: ${data.serverDeaf ? 'Yes' : 'No'}`,
  ].join('\n');
  const mediaValue = [
    `Camera / video: ${data.video ? 'ON' : 'OFF'}`,
    `Screen share / stream: ${data.streaming ? 'ON' : 'OFF'}`,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLOR_MAP[data.action] ?? colors.info)
    .setTitle(`${e('voice')} Voice — ${data.action}`)
    .setAuthor({ name: data.user, iconURL: data.userAvatar || undefined })
    .addFields(
      { name: `${e('member')} User`,        value: `<@${data.userId}>\n\`${data.user}\`\n\`${data.userId}\``, inline: true },
      { name: `${e('server')} Server`,      value: `${guild.name}\n\`${guild.id}\``,                         inline: true },
      { name: `${e('info')} Event`,         value: `\`${data.action}\``,                                      inline: true },
      { name: `${e('voice')} Channel`,      value: channelValue,                                             inline: true },
      { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`, inline: true },
      { name: `${e('info')} Voice State`,   value: stateValue,                                               inline: false },
      { name: `${e('info')} Camera / Stream`, value: mediaValue,                                             inline: true },
    );

  if (movementValue) {
    embed.addFields({ name: `${e('cross')} Channel Movement`, value: movementValue, inline: false });
  }
  if (Number.isFinite(data.vcDurationMs)) {
    embed.addFields({ name: `${e('clock')} Time in VC`, value: `\`${formatDuration(data.vcDurationMs)}\``, inline: true });
  }
  if (Number.isFinite(data.streamDurationMs)) {
    embed.addFields({ name: `${e('voice')} Time Streaming`, value: `\`${formatDuration(data.streamDurationMs)}\``, inline: true });
  }
  if (Number.isFinite(data.videoDurationMs)) {
    embed.addFields({ name: `${e('voice')} Time on Camera`, value: `\`${formatDuration(data.videoDurationMs)}\``, inline: true });
  }

  embed.setFooter(makeFooter(client, 'Voice Log')).setTimestamp();
  await sendLog(client, guild.id, 'voiceLogs', embed);
}

// ─── Channel Log ──────────────────────────────────────────────────────────────
async function logChannel(client, guild, type, data) {
  const META = {
    create: { emoji: e('join'),    color: colors.success, label: 'Created' },
    delete: { emoji: e('cross'),   color: colors.error,   label: 'Deleted' },
    update: { emoji: e('nick'),    color: colors.warning, label: 'Updated' },
  };
  const meta = META[type] ?? { emoji: e('channel'), color: colors.info, label: type };

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} Channel ${meta.label}`)
    .addFields(
      { name: `${e('channel')} Channel`,    value: `${data.name}\n\`${data.id || 'N/A'}\``, inline: true },
      { name: `${e('info')} Type`,          value: `\`${data.type || 'Unknown'}\``,          inline: true },
      { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`, inline: true },
    );

  if (data.category) embed.addFields({ name: `${e('server')} Category`, value: data.category, inline: true });

  embed.setFooter(makeFooter(client, 'Channel Log')).setTimestamp();
  await sendLog(client, guild.id, 'channelLogs', embed);
}

// ─── Invite Log ───────────────────────────────────────────────────────────────
async function logInvite(client, guild, data) {
  const embed = new EmbedBuilder()
    .setColor(colors.info)
    .setTitle(`${e('link')} Invite Used`)
    .addFields(
      { name: `${e('member')} New Member`,  value: `<@${data.userId}>\n\`${data.user}\`\n\`${data.userId}\``,        inline: true },
      { name: `${e('link')} Invite Code`,   value: `\`${data.code}\``,                                               inline: true },
      { name: `${e('crown')} Invited By`,   value: data.inviterId !== 'Unknown'
        ? `<@${data.inviterId}>\n\`${data.inviter}\``
        : `\`${data.inviter}\``,
        inline: true,
      },
      { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,         inline: true },
    )
    .setFooter(makeFooter(client, 'Invite Log'))
    .setTimestamp();

  await sendLog(client, guild.id, 'inviteLogs', embed);
}

// ─── Purge Log ────────────────────────────────────────────────────────────────
async function logPurge(client, guild, data) {
  const embed = new EmbedBuilder()
    .setColor(colors.warning)
    .setTitle(`${e('purge')} Purge All`)
    .addFields(
      { name: `${e('mod')} Moderator`,       value: `<@${data.moderatorId}>\n\`${data.moderator}\``, inline: true },
      { name: `${e('channel')} Channel`,     value: `<#${data.channelId}>`,                          inline: true },
      { name: `${e('purge')} Count Deleted`, value: `\`${data.count}\` messages`,                    inline: true },
      { name: `${e('calendar')} Timestamp`,  value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`, inline: true },
    );

  if (data.filterUser) {
    embed.addFields({ name: `${e('member')} Filter — User`, value: `\`${data.filterUser}\``, inline: true });
  }

  const messages = Array.isArray(data.messages) ? data.messages.filter(Boolean) : [];
  const orderedMessages = messages
    .slice()
    .sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));

  embed.addFields({
    name: `${e('log')} Deleted Messages`,
    value: orderedMessages.length
      ? 'The full purge is attached as a mobile-friendly HTML report.'
      : 'Message content was unavailable before deletion.',
    inline: false,
  });
  embed.setFooter(makeFooter(client, 'Purge Log')).setTimestamp();
  const report = Buffer.isBuffer(data.report)
    ? data.report
    : await generatePurgeTranscript(guild, orderedMessages, data);
  await sendLog(client, guild.id, 'purgeLogs', embed, [{
    attachment: report,
    name: 'purge-all.html',
  }]);
}

// ─── Command Usage Log ────────────────────────────────────────────────────────
function safeCommandValue(key, value) {
  if (/token|password|secret|api[-_]?key|credential/i.test(key)) return '[REDACTED]';
  if (value === undefined || value === null || value === '') return 'None';
  return String(value).replace(/`/g, '\'').slice(0, 240);
}

async function logCommandUsage(client, interaction, args = {}, result = {}) {
  try {
    const status = result.status === 'FAILED' ? 'FAILED' : 'SUCCESS';
    const durationMs = Number.isFinite(result.durationMs) ? Math.max(0, Math.round(result.durationMs)) : null;
    const errorMessage = result.error?.message ? String(result.error.message).slice(0, 500) : null;

    await CommandLog.create({
      guildId:     interaction.guildId || 'DM',
      userId:      interaction.user.id,
      userTag:     interaction.user.tag || interaction.user.username,
      command:     interaction.commandName,
      channelId:   interaction.channelId,
      channelName: interaction.channel?.name,
      args,
      guildName:   interaction.guild?.name,
      interactionId: interaction.id,
      status,
      durationMs,
      errorMessage,
    });

    if (!interaction.guildId) return;
    const config    = await getConfig(interaction.guildId);
    const channelId = config.logging.commandLogs;
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(status === 'SUCCESS' ? colors.success : colors.error)
      .setTitle(`${e(status === 'SUCCESS' ? 'check' : 'error')} Command ${status === 'SUCCESS' ? 'Completed' : 'Failed'} — /${interaction.commandName}`)
      .setAuthor({
        name:    interaction.user.tag || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .addFields(
        { name: `${e('member')} User`,        value: `<@${interaction.user.id}>\n\`${interaction.user.tag || interaction.user.username}\`\n\`${interaction.user.id}\``, inline: true },
        { name: `${e('server')} Server`,      value: `${interaction.guild.name}\n\`${interaction.guildId}\``,                                             inline: true },
        { name: `${e('channel')} Channel`,    value: `<#${interaction.channelId}>\n\`${interaction.channel?.name || 'Unknown'}\`\n\`${interaction.channelId}\``, inline: true },
        { name: `${e('info')} Result`,        value: `\`${status}\`${durationMs !== null ? `\nDuration: \`${durationMs}ms\`` : ''}`,                      inline: true },
        { name: `${e('link')} Interaction`,   value: `\`${interaction.id}\``,                                                                          inline: true },
        { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,                                          inline: true },
      );

    if (Object.keys(args).length > 0) {
      const argsStr = Object.entries(args)
        .map(([k, v]) => `\`${k}\`: ${safeCommandValue(k, v)}`)
        .join('\n')
        .slice(0, 1024);
      embed.addFields({ name: `${e('info')} Arguments`, value: argsStr, inline: false });
    }

    if (errorMessage) {
      embed.addFields({ name: `${e('error')} Error`, value: `\`${errorMessage.replace(/`/g, '\'')}\``, inline: false });
    }

    embed.setFooter(makeFooter(client, 'Command Log')).setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch { }
}

// ─── Bot Health Log ───────────────────────────────────────────────────────────
async function logBotHealth(client, data = {}) {
  const level = String(data.level || 'INFO').toUpperCase();
  const color = level === 'CRITICAL' ? colors.error : level === 'ERROR' ? colors.warning : colors.info;
  const error = data.error;
  const errorMessage = error?.message || (error ? String(error) : null);
  const stack = error?.stack && error.stack !== errorMessage ? error.stack : null;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${e(level === 'INFO' ? 'info' : level === 'CRITICAL' ? 'error' : 'warning')} Bot Health — ${data.title || level}`)
    .addFields(
      { name: `${e('info')} Status`,    value: `\`${level}\``, inline: true },
      { name: `${e('log')} Source`,     value: `\`${String(data.source || 'System').slice(0, 100)}\``, inline: true },
      { name: `${e('calendar')} Time`,  value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`, inline: true },
    )
    .setFooter(makeFooter(client, 'Bot Health Log'))
    .setTimestamp();

  if (data.details) {
    embed.addFields({ name: `${e('info')} Details`, value: String(data.details).slice(0, 1024), inline: false });
  }
  if (data.guildId) {
    embed.addFields({ name: `${e('server')} Guild`, value: `${data.guildName || 'Unknown'}\n\`${data.guildId}\``, inline: true });
  }
  if (errorMessage) {
    embed.addFields({ name: `${e('error')} Error`, value: `\`${String(errorMessage).replace(/`/g, '\'').slice(0, 1000)}\``, inline: false });
  }
  if (stack) {
    embed.addFields({ name: `${e('log')} Stack`, value: `\`\`\`${stack.replace(/```/g, '\'\'\'').slice(0, 1000)}\`\`\``, inline: false });
  }

  await sendLog(client, data.guildId || process.env.GUILD_ID, 'bothealthLogs', embed, [], { fallback: false });
}

module.exports = {
  sendLog, getConfig,
  logModAction, logMessage, logWelcome, logVoice,
  logChannel, logInvite, logPurge, logCommandUsage, logBotHealth,
};
