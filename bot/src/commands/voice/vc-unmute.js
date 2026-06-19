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
    .setName('vc-unmute')
    .setDescription('Remove server mute from a member in voice channel')
    .addUserOption(o => o.setName('user').setDescription('The user to VC unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.MuteMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') || 'No reason provided';

    let member;
    try { member = await interaction.guild.members.fetch(targetUser.id); } catch (ex) {
      logError('vc-unmute:fetch', ex);
      return interaction.editReply({ embeds: [err(`${e('cross')} That user is not in this server.`)] });
    }

    if (!member.voice.channel) {
      return interaction.editReply({
        embeds: [err(`${e('cross')} **${member.displayName}** is not in a voice channel.`)],
      });
    }

    if (!member.voice.serverMute) {
      return interaction.editReply({
        embeds: [warn(`${e('warning')} **${member.displayName}** is not server muted.`)],
      });
    }

    await member.voice.setMute(false, `${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'VC_UNMUTE', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'VC_UNMUTE', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId, channel: member.voice.channel.id,
    });

    await interaction.editReply({
      embeds: [ok(`${e('check')} Voice unmuted **${member.displayName}** — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
