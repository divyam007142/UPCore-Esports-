const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const CommandLog = require('../models/CommandLog');
const { colors } = require('../config/config');
const { e } = require('../utils/emoji');
const { formatIST } = require('../utils/time');
const { makeFooter } = require('../utils/embeds');

async function getConfig(guildId) {
  let config = await GuildConfig.findOne({ guildId });
  if (!config) config = await GuildConfig.create({ guildId });
  return config;
}

async function sendLog(client, guildId, logType, embed) {
  try {
    const config    = await getConfig(guildId);
    const channelId = config.logging[logType] || process.env.LOGS_CHANNEL_ID;
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;
    await channel.send({ embeds: [embed] });
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
    .setTitle(`${meta.emoji} ${meta.label} — Case #${data.caseId}`)
    .setAuthor({ name: data.target, iconURL: data.targetAvatar || undefined })
    .addFields(
      { name: `${e('member')} Target`,    value: `<@${data.targetId}>\n\`${data.target}\`\n\`${data.targetId}\``,       inline: true },
      { name: `${e('mod')} Moderator`,   value: `<@${data.moderatorId}>\n\`${data.moderator}\``,                        inline: true },
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
      : '`[No text content — possibly an embed or attachment]`',
    inline: false,
  });

  if (data.attachments?.length) {
    embed.addFields({
      name:  `${e('screenshot')} Attachments (${data.attachments.length})`,
      value: data.attachments.slice(0, 5).join('\n').slice(0, 1024),
      inline: false,
    });
  }

  embed.setFooter(makeFooter(client, 'Message Log')).setTimestamp();
  await sendLog(client, guild.id, 'messageLogs', embed);
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
async function logVoice(client, guild, data) {
  const COLOR_MAP = {
    'Joined':     colors.success,
    'Left':       colors.error,
    'Moved':      colors.info,
    'Muted':      colors.moderation,
    'Unmuted':    colors.success,
    'Deafened':   colors.moderation,
    'Undeafened': colors.success,
  };

  const embed = new EmbedBuilder()
    .setColor(COLOR_MAP[data.action] ?? colors.info)
    .setTitle(`${e('voice')} Voice — ${data.action}`)
    .setAuthor({ name: data.user, iconURL: data.userAvatar || undefined })
    .addFields(
      { name: `${e('member')} User`,        value: `<@${data.userId}>\n\`${data.user}\`\n\`${data.userId}\``, inline: true },
      { name: `${e('voice')} Channel`,      value: data.channel || 'N/A',                                     inline: true },
      { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,  inline: true },
    );

  if (data.from) embed.addFields({ name: `${e('cross')} From`, value: `\`${data.from}\``, inline: true });
  if (data.to)   embed.addFields({ name: `${e('check')} To`,   value: `\`${data.to}\``,   inline: true });

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

// ─── AutoMod Log ──────────────────────────────────────────────────────────────
async function logAutomod(client, guild, data) {
  const embed = new EmbedBuilder()
    .setColor(colors.error)
    .setTitle(`${e('automod')} AutoMod — Content Blocked`)
    .addFields(
      { name: `${e('member')} User`,         value: `<@${data.userId}>\n\`${data.user}\`\n\`${data.userId}\``, inline: true },
      { name: `${e('channel')} Channel`,     value: `<#${data.channelId}>`,                                    inline: true },
      { name: `${e('warning')} Trigger`,     value: `\`${data.reason}\``,                                      inline: true },
      { name: `${e('log')} Blocked Content`, value: `\`\`\`${data.content?.slice(0, 950) || 'N/A'}\`\`\``,    inline: false },
      { name: `${e('calendar')} Timestamp`,  value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,  inline: true },
    )
    .setFooter(makeFooter(client, 'AutoMod'))
    .setTimestamp();

  await sendLog(client, guild.id, 'automodLogs', embed);
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
    .setTitle(`${e('purge')} Bulk Message Delete`)
    .addFields(
      { name: `${e('mod')} Moderator`,       value: `<@${data.moderatorId}>\n\`${data.moderator}\``, inline: true },
      { name: `${e('channel')} Channel`,     value: `<#${data.channelId}>`,                          inline: true },
      { name: `${e('purge')} Count Deleted`, value: `\`${data.count}\` messages`,                    inline: true },
      { name: `${e('calendar')} Timestamp`,  value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`, inline: true },
    );

  if (data.filterUser) {
    embed.addFields({ name: `${e('member')} Filter — User`, value: `\`${data.filterUser}\``, inline: true });
  }

  embed.setFooter(makeFooter(client, 'Purge Log')).setTimestamp();
  await sendLog(client, guild.id, 'purgeLogs', embed);
}

// ─── Command Usage Log ────────────────────────────────────────────────────────
async function logCommandUsage(client, interaction, args = {}) {
  try {
    await CommandLog.create({
      guildId:     interaction.guildId,
      userId:      interaction.user.id,
      userTag:     interaction.user.username,
      command:     interaction.commandName,
      channelId:   interaction.channelId,
      channelName: interaction.channel?.name,
      args,
    });

    const config    = await getConfig(interaction.guildId);
    const channelId = config.logging.commandLogs;
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(colors.neutral)
      .setTitle(`${e('log')} Command Used — /${interaction.commandName}`)
      .setAuthor({
        name:    interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .addFields(
        { name: `${e('member')} User`,        value: `<@${interaction.user.id}>\n\`${interaction.user.username}\`\n\`${interaction.user.id}\``, inline: true },
        { name: `${e('channel')} Channel`,    value: `<#${interaction.channelId}>\n\`${interaction.channel?.name}\``,                          inline: true },
        { name: `${e('calendar')} Timestamp`, value: `<t:${Math.floor(Date.now() / 1000)}:F>\n${formatIST()}`,                                 inline: true },
      );

    if (Object.keys(args).length > 0) {
      const argsStr = Object.entries(args)
        .map(([k, v]) => `\`${k}\`: ${v}`)
        .join('\n')
        .slice(0, 1024);
      embed.addFields({ name: `${e('info')} Arguments`, value: argsStr, inline: false });
    }

    embed.setFooter(makeFooter(client, 'Command Log')).setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch { }
}

module.exports = {
  sendLog, getConfig,
  logModAction, logMessage, logWelcome, logVoice,
  logChannel, logAutomod, logInvite, logPurge, logCommandUsage,
};
