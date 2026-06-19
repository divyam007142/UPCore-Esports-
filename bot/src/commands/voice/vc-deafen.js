const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAdminRole, checkOwnerProtection, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { logError } = require('../../utils/console');

const ok   = (text) => new EmbedBuilder().setColor(colors.moderation).setDescription(text);
const err  = (text) => new EmbedBuilder().setColor(colors.error).setDescription(text);
const warn = (text) => new EmbedBuilder().setColor(colors.warning).setDescription(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc-deafen')
    .setDescription('Server deafen a member in voice channel')
    .addUserOption(o => o.setName('user').setDescription('The user to deafen').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.DeafenMembers])) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason') || 'No reason provided';

    let member;
    try { member = await interaction.guild.members.fetch(targetUser.id); } catch (ex) {
      logError('vc-deafen:fetch', ex);
      return interaction.editReply({ embeds: [err(`${e('cross')} That user is not in this server.`)] });
    }

    if (!await checkOwnerProtection(interaction, member)) return;

    if (!member.voice.channel) {
      return interaction.editReply({
        embeds: [err(`${e('cross')} **${member.displayName}** is not in a voice channel.`)],
      });
    }

    if (member.voice.serverDeaf) {
      return interaction.editReply({
        embeds: [warn(`${e('warning')} **${member.displayName}** is already server deafened.`)],
      });
    }

    await member.voice.setDeaf(true, `${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'VC_DEAFEN', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'VC_DEAFEN', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId, channel: member.voice.channel.id,
    });

    await interaction.editReply({
      embeds: [ok(`${e('check')} Deafened **${member.displayName}** in \`${member.voice.channel.name}\` — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
