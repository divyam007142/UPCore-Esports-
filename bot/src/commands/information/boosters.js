const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors, emojis } = require('../../config/config');
const { discordTimestamp } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

const BOOST_TIERS = ['No Boost', 'Level 1', 'Level 2', 'Level 3'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosters')
    .setDescription('View a list of all members currently boosting the server'),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();

    const { guild } = interaction;
    await guild.members.fetch();

    const boosters = guild.members.cache
      .filter(m => m.premiumSince)
      .sort((a, b) => a.premiumSince - b.premiumSince);

    const tier     = BOOST_TIERS[guild.premiumTier] ?? 'Unknown';
    const boostCount = guild.premiumSubscriptionCount ?? 0;

    if (!boosters.size) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.neutral)
          .setTitle(`${emojis.star}  Server Boosters`)
          .setDescription('No members are currently boosting this server.')
          .addFields({ name: `${emojis.star} Boost Tier`, value: `\`${tier}\``, inline: true })
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    const lines = boosters.map((m, _, map) => {
      const since = discordTimestamp(m.premiumSince, 'R');
      return `${emojis.star} <@${m.id}> — Boosting ${since}`;
    });

    // Discord embed description cap: split into chunks of 25 if needed
    const shown = lines.slice(0, 25);
    const extra = boosters.size > 25 ? `\n*…and ${boosters.size - 25} more*` : '';

    const embed = new EmbedBuilder()
      .setColor(colors.gold)
      .setTitle(`${emojis.star}  Server Boosters — ${guild.name}`)
      .setDescription(shown.join('\n') + extra)
      .addFields(
        { name: `${emojis.member} Total Boosters`,   value: `\`${boosters.size}\``, inline: true },
        { name: `${emojis.star} Total Boosts`,       value: `\`${boostCount}\``,   inline: true },
        { name: `${emojis.fire} Boost Tier`,         value: `\`${tier}\``,          inline: true },
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter(makeFooter(client, `${boosters.size} booster${boosters.size !== 1 ? 's' : ''}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
