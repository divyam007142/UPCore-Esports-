const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkOwnerProtection, checkRoleHierarchy, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { formatIST, formatDuration } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

const DURATION_OPTIONS = [
  { name: '1 Day',    value: 86400   },
  { name: '3 Days',   value: 259200  },
  { name: '7 Days',   value: 604800  },
  { name: '14 Days',  value: 1209600 },
  { name: 'Permanent', value: 0      },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addStringOption(o =>
      o.setName('duration').setDescription('Ban duration')
        .addChoices(...DURATION_OPTIONS.map(d => ({ name: d.name, value: String(d.value) })))
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName('delete_messages').setDescription('Delete message history (days, 0–7)')
        .setMinValue(0).setMaxValue(7).setRequired(false)
    ),
  cooldown: 5000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.BanMembers])) return;

    const targetUser      = interaction.options.getUser('user');
    const reason          = interaction.options.getString('reason') || 'No reason provided';
    const durationVal     = parseInt(interaction.options.getString('duration') || '0');
    const deleteMessageDays = interaction.options.getInteger('delete_messages') ?? 0;
    const durationLabel   = DURATION_OPTIONS.find(d => d.value === durationVal)?.name || 'Permanent';

    // Can't ban yourself
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`${emojis.error}  You cannot ban yourself.`).setFooter(makeFooter(client))],
        ephemeral: true,
      });
    }

    if (targetUser.id === client.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`${emojis.error}  I cannot ban myself.`).setFooter(makeFooter(client))],
        ephemeral: true,
      });
    }

    let targetMember;
    try { targetMember = await interaction.guild.members.fetch(targetUser.id); } catch { targetMember = null; }

    if (targetMember) {
      if (!await checkOwnerProtection(interaction, targetMember)) return;
      if (!await checkRoleHierarchy(interaction, targetMember)) return;
    }

    // Already banned?
    try {
      await interaction.guild.bans.fetch(targetUser.id);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${emojis.warning}  **${targetUser.tag}** is already banned from this server.`)
          .setFooter(makeFooter(client))],
        ephemeral: true,
      });
    } catch { }

    // DM the user before ban
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(colors.error)
        .setTitle(`${emojis.ban}  You have been Banned`)
        .setDescription(`You have been banned from **${interaction.guild.name}**.`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: `${emojis.log} Reason`,     value: reason, inline: false },
          { name: `${emojis.clock} Duration`, value: durationLabel, inline: true },
          { name: `${emojis.mod} Moderator`,  value: interaction.user.tag, inline: true },
          { name: `${emojis.time} Time`,      value: formatIST(), inline: true },
        )
        .setFooter({ text: 'UPCORE Esports — Contact staff if you believe this was a mistake' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { }

    await interaction.guild.members.ban(targetUser.id, {
      reason: `${reason} | Mod: ${interaction.user.tag}`,
      deleteMessageSeconds: deleteMessageDays * 86400,
    });

    if (durationVal > 0) {
      setTimeout(async () => {
        try { await interaction.guild.members.unban(targetUser.id, 'Ban duration expired'); } catch { }
      }, durationVal * 1000);
    }

    const newCase = await createCase(interaction.guildId, {
      action: 'BAN', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag,
      reason, duration: durationVal || null,
    });

    await logModAction(client, interaction.guild, {
      action: 'BAN', target: targetUser.tag, targetId: targetUser.id,
      targetAvatar: targetUser.displayAvatarURL({ dynamic: true }),
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, duration: durationLabel, caseId: newCase.caseId,
    });

    const embed = new EmbedBuilder()
      .setColor(colors.error)
      .setDescription(
        `${emojis.ban} <@${targetUser.id}> has been **banned**` +
        (durationVal > 0 ? ` · Duration: ${durationLabel}` : '') +
        (reason !== 'No reason provided' ? ` · Reason: ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}  ·  Case #${String(newCase.caseId).padStart(4, '0')}`))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
