const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, OverwriteType } = require('discord.js');
const { checkAdminRole, checkBotPermissions } = require('../../utils/permissions');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('Hide a channel from a member or role by updating its view permissions')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Channel to hide (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildForum)
        .setRequired(false)
    )
    .addRoleOption(o =>
      o.setName('role').setDescription('Role to hide the channel from').setRequired(false)
    )
    .addUserOption(o =>
      o.setName('user').setDescription('Member to hide the channel from').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('reason').setDescription('Reason').setRequired(false)
    ),
  cooldown: 4000,

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!await checkAdminRole(interaction)) return;
    if (!await checkBotPermissions(interaction, [PermissionFlagsBits.ManageChannels])) return;

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const role    = interaction.options.getRole('role');
    const user    = interaction.options.getUser('user');
    const reason  = interaction.options.getString('reason') || 'No reason provided';

    if (!role && !user) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setDescription(`${e('cross')} Please specify at least one **role** or **user** to hide the channel from.`)
          .setFooter(makeFooter(client))],
      });
    }

    const targets = [];

    if (role) {
      await channel.permissionOverwrites.edit(role, { ViewChannel: false }, { reason: `${reason} | Mod: ${interaction.user.tag}` });
      targets.push(`<@&${role.id}>`);
    }
    if (user) {
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(colors.error)
            .setDescription(`${e('cross')} Could not find **${user.tag}** in this server.`)
            .setFooter(makeFooter(client))],
        });
      }
      await channel.permissionOverwrites.edit(member, { ViewChannel: false }, { reason: `${reason} | Mod: ${interaction.user.tag}` });
      targets.push(`<@${user.id}>`);
    }

    const embed = new EmbedBuilder()
      .setColor(colors.moderation)
      .setDescription(
        `${emojis.lock}  **Hidden** <#${channel.id}> from ${targets.join(', ')}` +
        (reason !== 'No reason provided' ? `\n${emojis.log}  ${reason}` : '')
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
