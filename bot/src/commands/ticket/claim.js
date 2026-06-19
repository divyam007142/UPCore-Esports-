const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('This command has been removed.'),
  async execute(interaction) {
    await interaction.reply({ content: '❌  The `/claim` command has been removed from this server.', ephemeral: true });
  },
};
