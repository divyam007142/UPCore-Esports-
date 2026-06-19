module.exports = {
  id: 'btn_claim',
  async execute(interaction) {
    await interaction.reply({ content: '❌  The claim feature has been removed.', ephemeral: true });
  },
};
