const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

const TYPE_MAP = {
  [ChannelType.GuildText]:          'Text',
  [ChannelType.GuildVoice]:         'Voice',
  [ChannelType.GuildCategory]:      'Category',
  [ChannelType.GuildAnnouncement]:  'Announcement',
  [ChannelType.GuildStageVoice]:    'Stage',
  [ChannelType.GuildForum]:         'Forum',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel-info')
    .setDescription('Display information about a channel')
    .addChannelOption(o =>
      o.setName('channel').setDescription('The channel (defaults to current)').setRequired(false),
    ),
  cooldown: 3000,

  async execute(interaction, client) {
    const channel   = interaction.options.getChannel('channel') ?? interaction.channel;
    const createdTs = Math.floor(channel.createdTimestamp / 1000);
    const typeLabel = TYPE_MAP[channel.type] ?? `Unknown (${channel.type})`;

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`${emojis.channel}  #${channel.name}`)
      .addFields(
        { name: `${emojis.key} Channel ID`,  value: `\`${channel.id}\``,                     inline: true },
        { name: `${emojis.info} Type`,       value: typeLabel,                                inline: true },
        { name: `${emojis.config} Position`, value: `\`${channel.position ?? 'N/A'}\``,      inline: true },
        { name: `${emojis.calendar} Created`, value: `<t:${createdTs}:D>\n<t:${createdTs}:R>`, inline: true },
        { name: `${emojis.channel} Category`, value: channel.parent?.name ?? 'None',          inline: true },
      );

    if (channel.topic) {
      embed.addFields({ name: `${emojis.note} Topic`, value: channel.topic.slice(0, 1024), inline: false });
    }

    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      embed.addFields(
        { name: `${emojis.warning} NSFW`,     value: channel.nsfw ? `${emojis.check} Yes` : `${emojis.cross} No`, inline: true },
        { name: `${emojis.clock} Slowmode`,   value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Off', inline: true },
      );
    }

    if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
      embed.addFields(
        { name: `${emojis.voice} Bitrate`,    value: `${Math.floor(channel.bitrate / 1000)}kbps`, inline: true },
        { name: `${emojis.member} User Limit`, value: channel.userLimit ? `${channel.userLimit}` : 'Unlimited', inline: true },
      );
    }

    embed.setFooter(makeFooter(client, `Requested by ${interaction.user.username}`)).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
