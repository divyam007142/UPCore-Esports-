const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { makeFooter } = require('../../utils/embeds');

const BOOST_TIERS = ['No Boost', 'Level 1', 'Level 2', 'Level 3'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Display detailed server member statistics'),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const { guild } = interaction;
    await guild.members.fetch();

    const all     = guild.members.cache;
    const total   = guild.memberCount;
    const bots    = all.filter(m => m.user.bot).size;
    const humans  = total - bots;
    const online  = all.filter(m => m.presence?.status === 'online').size;
    const idle    = all.filter(m => m.presence?.status === 'idle').size;
    const dnd     = all.filter(m => m.presence?.status === 'dnd').size;
    const offline = total - online - idle - dnd;
    const boosters = guild.premiumSubscriptionCount ?? 0;
    const tier     = BOOST_TIERS[guild.premiumTier] ?? 'Unknown';

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle(`${emojis.member}  Member Count — ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        {
          name:   `${emojis.member} Members`,
          value:  `> Total: \`${total.toLocaleString()}\`\n> Humans: \`${humans.toLocaleString()}\`\n> Bots: \`${bots.toLocaleString()}\``,
          inline: true,
        },
        {
          name:   `${emojis.stats} Status`,
          value:  `> 🟢 Online: \`${online}\`\n> 🟡 Idle: \`${idle}\`\n> 🔴 DND: \`${dnd}\`\n> ⚫ Offline: \`${offline}\``,
          inline: true,
        },
        {
          name:   `${emojis.star} Boosts`,
          value:  `> Boosters: \`${boosters}\`\n> Tier: \`${tier}\``,
          inline: true,
        },
      )
      .setFooter(makeFooter(client, `Requested by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
