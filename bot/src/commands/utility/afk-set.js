const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../../config/config');
const { e } = require('../../utils/emoji');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk-set')
    .setDescription('Set your AFK status')
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Why are you going AFK?')
        .setRequired(false)
        .setMaxLength(200),
    ),
  cooldown: 5000,

  async execute(interaction, client) {
    if (client.afkUsers.has(interaction.user.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.warning)
          .setDescription(`${e('warning')}  You're already AFK. Send any message to clear your current status.`)],
        ephemeral: true,
      });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';
    client.afkUsers.set(interaction.user.id, { reason, since: new Date() });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(colors.neutral)
        .setDescription(`${e('afk')}  You are now AFK, See you later <@${interaction.user.id}>`)],
      ephemeral: true,
    });
  },
};
