const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions, checkOwnerProtection, checkRoleHierarchy } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false)),
  cooldown: 5000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.KickMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(colors.error).setDescription(`${emojis.error}  You cannot kick yourself.`).setFooter(makeFooter(client))],
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${emojis.error}  That user is not in this server.`)
          .setFooter(makeFooter(client))],
      });
    }

    if (!await checkOwnerProtection(interaction, targetMember)) return;
    if (!await checkRoleHierarchy(interaction, targetMember)) return;

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(colors.moderation)
        .setTitle(`${emojis.kick}  You have been Kicked`)
        .setDescription(`You have been kicked from **${interaction.guild.name}**.`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: `${emojis.log} Reason`,    value: reason, inline: false },
          { name: `${emojis.mod} Moderator`, value: interaction.user.tag, inline: true },
          { name: `${emojis.time} Time`,     value: formatIST(), inline: true },
        )
        .setFooter({ text: 'UPCORE Esports — You may rejoin with a valid invite' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { }

    await targetMember.kick(`${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'KICK', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'KICK', target: targetUser.tag, targetId: targetUser.id,
      targetAvatar: targetUser.displayAvatarURL({ dynamic: true }),
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId,
    });

    const embed = new EmbedBuilder()
      .setColor(colors.moderation)
      .setDescription(
        `${emojis.kick} <@${targetUser.id}> has been **kicked**` +
        (reason !== 'No reason provided' ? ` · Reason: ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}  ·  Case #${String(newCase.caseId).padStart(4, '0')}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
