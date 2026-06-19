const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkOwnerProtection, checkRoleHierarchy, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { formatIST, parseDuration, formatDuration } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

const err  = (text) => new EmbedBuilder().setColor(colors.error).setDescription(text);
const warn = (text) => new EmbedBuilder().setColor(colors.warning).setDescription(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .addUserOption(o => o.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration — e.g. 10m, 1h, 1d (max 28d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the mute').setRequired(false)),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) return;

    const targetUser  = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason      = interaction.options.getString('reason') || 'No reason provided';
    const durationMs  = parseDuration(durationStr);

    if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.editReply({
        embeds: [err(`${e('cross')} Invalid duration \`${durationStr}\` — use formats like \`10m\`, \`1h\`, \`1d\` (max 28d).`)],
      });
    }

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.editReply({
        embeds: [err(`${e('cross')} That user is not in this server.`)],
      });
    }

    if (!await checkOwnerProtection(interaction, targetMember)) return;
    if (!await checkRoleHierarchy(interaction, targetMember)) return;

    if (targetMember.isCommunicationDisabled()) {
      const remaining = targetMember.communicationDisabledUntil
        ? `<t:${Math.floor(targetMember.communicationDisabledUntil.getTime() / 1000)}:R>`
        : 'soon';
      return interaction.editReply({
        embeds: [warn(`${e('warning')} **${targetMember.displayName}** is already timed out — expires ${remaining}.`)],
      });
    }

    await targetMember.timeout(durationMs, `${reason} | Mod: ${interaction.user.tag}`);

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle(`${emojis.mute}  You have been Muted`)
        .setDescription(`You have been timed out in **${interaction.guild.name}**.`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: `${emojis.log} Reason`,     value: reason },
          { name: `${emojis.clock} Duration`, value: formatDuration(durationMs), inline: true },
          { name: `${emojis.mod} Moderator`,  value: interaction.user.tag, inline: true },
          { name: `${emojis.time} Time`,      value: formatIST(), inline: true },
        )
        .setFooter({ text: 'UPCORE Esports — Your timeout will expire automatically' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { }

    const newCase = await createCase(interaction.guildId, {
      action: 'MUTE', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag,
      reason, duration: durationMs,
    });

    await logModAction(client, interaction.guild, {
      action: 'MUTE', target: targetUser.tag, targetId: targetUser.id,
      targetAvatar: targetUser.displayAvatarURL({ dynamic: true }),
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, duration: formatDuration(durationMs), caseId: newCase.caseId,
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(colors.warning)
        .setDescription(`${e('check')} Timed out **${targetMember.displayName}** for \`${formatDuration(durationMs)}\` — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
