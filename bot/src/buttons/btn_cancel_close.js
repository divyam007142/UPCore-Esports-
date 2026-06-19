const { EmbedBuilder } = require('discord.js');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_cancel_close',
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${e('success') || '✅'}  Close Cancelled`)
      .setDescription('No worries! This ticket is still open. Feel free to continue the conversation.')
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.update({ embeds: [embed], components: [] });
  },
};
