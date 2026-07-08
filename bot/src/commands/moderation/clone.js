const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

const CLONEABLE = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildForum,
  ChannelType.GuildStageVoice,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Create an exact copy of a channel, preserving its permissions and settings')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to clone (defaults to current channel)')
        .addChannelTypes(...CLONEABLE)
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('name')
        .setDescription('Name for the cloned channel (defaults to "channel-name-copy")')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('reason').setDescription('Reason for cloning').setRequired(false)
    ),
  cooldown: 10000,

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const source  = interaction.options.getChannel('channel') ?? interaction.channel;
    const newName = interaction.options.getString('name') ?? `${source.name}-copy`;
    const reason  = interaction.options.getString('reason') || 'No reason provided';

    const cloned = await source.clone({
      name:   newName,
      reason: `${reason} | Mod: ${interaction.user.tag}`,
    });

    // Position the clone directly after the source
    await cloned.setPosition(source.position + 1).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setDescription(
        `${emojis.channel}  **Cloned** \`${source.name}\` → <#${cloned.id}>` +
        (reason !== 'No reason provided' ? `\n${emojis.log}  ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
