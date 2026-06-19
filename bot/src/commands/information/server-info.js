const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

const VERIFICATION_LEVELS = ['None', 'Low', 'Medium', 'High', 'Very High'];
const CONTENT_FILTERS     = ['Disabled', 'Members without roles', 'All members'];
const BOOST_TIERS         = ['No Boost Level', 'Level 1', 'Level 2', 'Level 3'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Display detailed server information'),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const { guild } = interaction;
    await guild.fetch();

    const owner         = await guild.fetchOwner().catch(() => null);
    const channels      = guild.channels.cache;
    const textChannels  = channels.filter(c => c.isTextBased()).size;
    const voiceChannels = channels.filter(c => c.isVoiceBased()).size;
    const categories    = channels.filter(c => c.type === 4).size;
    const totalMembers  = guild.memberCount;
    const bots          = guild.members.cache.filter(m => m.user.bot).size;
    const roles         = guild.roles.cache.size - 1;
    const emojisCount   = guild.emojis.cache.size;
    const stickers      = guild.stickers.cache.size;
    const boostTier     = guild.premiumTier;
    const boosts        = guild.premiumSubscriptionCount ?? 0;
    const createdTs     = Math.floor(guild.createdTimestamp / 1000);

    const iconURL   = guild.iconURL({ size: 256 });
    const bannerURL = guild.bannerURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${emojis.server}  ${guild.name}`)
      .addFields(
        {
          name:   `${emojis.crown} Owner`,
          value:  owner
            ? `<@${owner.id}>\n\`${owner.user.username}\``
            : '`Unknown`',
          inline: true,
        },
        { name: `${emojis.key} Server ID`,      value: `\`${guild.id}\``,                              inline: true },
        { name: `${emojis.calendar} Created`,   value: `<t:${createdTs}:D>\n<t:${createdTs}:R>`,       inline: true },
        {
          name:   `${emojis.member} Members`,
          value:  `> Total: \`${totalMembers}\`\n> Humans: \`${totalMembers - bots}\`\n> Bots: \`${bots}\``,
          inline: true,
        },
        {
          name:   `${emojis.channel} Channels`,
          value:  `> Text: \`${textChannels}\`\n> Voice: \`${voiceChannels}\`\n> Categories: \`${categories}\``,
          inline: true,
        },
        {
          name:   `${emojis.config} Details`,
          value:  `> Roles: \`${roles}\`\n> Emojis: \`${emojisCount}\`\n> Stickers: \`${stickers}\``,
          inline: true,
        },
        {
          name:   `${emojis.star} Boost Status`,
          value:  `> Boosts: \`${boosts}\`\n> Tier: ${BOOST_TIERS[boostTier] ?? 'Unknown'}`,
          inline: true,
        },
        {
          name:   `${emojis.shield} Verification`,
          value:  `\`${VERIFICATION_LEVELS[guild.verificationLevel] ?? guild.verificationLevel}\``,
          inline: true,
        },
        {
          name:   `${emojis.mod} Content Filter`,
          value:  `\`${CONTENT_FILTERS[guild.explicitContentFilter] ?? guild.explicitContentFilter}\``,
          inline: true,
        },
      )
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    if (iconURL)   embed.setThumbnail(iconURL);
    if (bannerURL) embed.setImage(bannerURL);

    await interaction.editReply({ embeds: [embed] });
  },
};
