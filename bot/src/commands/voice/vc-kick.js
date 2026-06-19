const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkOwnerProtection, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { logError } = require('../../utils/console');

const ok   = (text) => new EmbedBuilder().setColor(colors.moderation).setDescription(text);
const err  = (text) => new EmbedBuilder().setColor(colors.error).setDescription(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc-kick')
    .setDescription('Kick a member from their voice channel')
    .addUserOption(o => o.setName('user').setDescription('The user to kick from VC').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.MoveMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') || 'No reason provided';

    let member;
    try { member = await interaction.guild.members.fetch(targetUser.id); } catch (ex) {
      logError('vc-kick:fetch', ex);
      return interaction.editReply({ embeds: [err(`${e('cross')} That user is not in this server.`)] });
    }

    if (!await checkOwnerProtection(interaction, member)) return;

    if (!member.voice.channel) {
      return interaction.editReply({
        embeds: [err(`${e('cross')} **${member.displayName}** is not in a voice channel.`)],
      });
    }

    const channelName = member.voice.channel.name;
    await member.voice.disconnect(`${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'VC_KICK', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'VC_KICK', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId, channel: member.voice.channelId,
    });

    await interaction.editReply({
      embeds: [ok(`${e('check')} Kicked **${member.displayName}** from \`${channelName}\` — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
