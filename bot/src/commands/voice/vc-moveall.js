const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vc-moveall')
    .setDescription('Move all connected members from one voice channel to another')
    .addChannelOption(o =>
      o.setName('from')
        .setDescription('Source voice channel to move members from')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    )
    .addChannelOption(o =>
      o.setName('to')
        .setDescription('Destination voice channel to move members to')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    ),
  cooldown: 10000,

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.MoveMembers])) return;

    const fromChannel = interaction.options.getChannel('from');
    const toChannel   = interaction.options.getChannel('to');

    if (fromChannel.id === toChannel.id) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('cross')} Source and destination channels cannot be the same.`)
          .setFooter(makeFooter(client))],
      });
    }

    const members = fromChannel.members;

    if (!members.size) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${e('warning')} There are no members in <#${fromChannel.id}> to move.`)
          .setFooter(makeFooter(client))],
      });
    }

    const results = await Promise.allSettled(
      members.map(member => member.voice.setChannel(toChannel, `vc-moveall by ${interaction.user.tag}`))
    );

    const moved  = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const embed = new EmbedBuilder()
      .setColor(colors.moderation)
      .setDescription(
        `${emojis.voice}  **Moved \`${moved}\` member${moved !== 1 ? 's' : ''}** from <#${fromChannel.id}> → <#${toChannel.id}>` +
        (failed ? `\n${emojis.warning}  \`${failed}\` member${failed !== 1 ? 's' : ''} could not be moved` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
