const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { logError } = require('../../utils/console');

const ok   = (text) => new EmbedBuilder().setColor(colors.success).setDescription(text);
const err  = (text) => new EmbedBuilder().setColor(colors.error).setDescription(text);
const warn = (text) => new EmbedBuilder().setColor(colors.warning).setDescription(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unmute').setRequired(false)),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') || 'No reason provided';

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (ex) {
      logError('unmute:fetch', ex);
      return interaction.editReply({ embeds: [err(`${e('cross')} That user is not in this server.`)] });
    }

    if (!targetMember.isCommunicationDisabled()) {
      return interaction.editReply({
        embeds: [warn(`${e('warning')} **${targetMember.displayName}** is not currently timed out.`)],
      });
    }

    await targetMember.timeout(null, `${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'UNMUTE', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'UNMUTE', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId,
    });

    await interaction.editReply({
      embeds: [ok(`${e('check')} Removed timeout from **${targetMember.displayName}** — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
