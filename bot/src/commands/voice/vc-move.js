const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { logError } = require('../../utils/console');

const ok   = (text) => new EmbedBuilder().setColor(colors.info).setDescription(text);
const err  = (text) => new EmbedBuilder().setColor(colors.error).setDescription(text);
const warn = (text) => new EmbedBuilder().setColor(colors.warning).setDescription(text);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc-move')
    .setDescription('Move a member to another voice channel')
    .addUserOption(o => o.setName('user').setDescription('The user to move').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Target voice channel').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice).setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),
  cooldown: 3000,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.MoveMembers])) return;

    const targetUser    = interaction.options.getUser('user');
    const targetChannel = interaction.options.getChannel('channel');
    const reason        = interaction.options.getString('reason') || 'No reason provided';

    let member;
    try { member = await interaction.guild.members.fetch(targetUser.id); } catch (ex) {
      logError('vc-move:fetch', ex);
      return interaction.editReply({ embeds: [err(`${e('cross')} That user is not in this server.`)] });
    }

    if (!member.voice.channel) {
      return interaction.editReply({
        embeds: [err(`${e('cross')} **${member.displayName}** is not in a voice channel.`)],
      });
    }

    if (member.voice.channelId === targetChannel.id) {
      return interaction.editReply({
        embeds: [warn(`${e('warning')} **${member.displayName}** is already in \`${targetChannel.name}\`.`)],
      });
    }

    const fromChannel = member.voice.channel.name;
    await member.voice.setChannel(targetChannel, `${reason} | Mod: ${interaction.user.tag}`);

    const newCase = await createCase(interaction.guildId, {
      action: 'VC_MOVE', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'VC_MOVE', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId, from: fromChannel, to: targetChannel.name,
    });

    await interaction.editReply({
      embeds: [ok(`${e('check')} Moved **${member.displayName}** from \`${fromChannel}\` → \`${targetChannel.name}\` — Case \`#${String(newCase.caseId).padStart(4, '0')}\``)],
    });
  },
};
