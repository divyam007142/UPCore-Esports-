const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { formatDuration } = require('../../utils/time');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk-remove')
    .setDescription('Remove your AFK status manually'),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!client.afkUsers.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${e('warning')}  You're not currently AFK.`)],
        ephemeral: true,
      });
    }

    const afkData = client.afkUsers.get(interaction.user.id);
    const awayMs  = afkData?.since ? Date.now() - new Date(afkData.since).getTime() : 0;
    const awayStr = awayMs > 0 ? formatDuration(awayMs) : 'a moment';
    client.afkUsers.delete(interaction.user.id);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(colors.success)
        .setDescription(
          `${e('check')}  Welcome back <@${interaction.user.id}>! I have removed your AFK.\n` +
          `${e('clock')}  You were away for ${awayStr}`,
        )],
    });
  },
};
