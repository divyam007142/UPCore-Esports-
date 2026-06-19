const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { e } = require('../../utils/emoji');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Fetch anime images'),
  cooldown: 3000,
  category: 'fun',

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(`${e('warning') || '⚠️'}  **This command is currently unavailable. Please try again later!**`)
      .setFooter(makeFooter(client));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
