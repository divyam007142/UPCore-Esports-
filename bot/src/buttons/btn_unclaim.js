module.exports = {
  id: 'btn_unclaim',
  async execute(interaction) {
    await interaction.reply({ content: '❌  The unclaim feature has been removed.', ephemeral: true });
  },
};
