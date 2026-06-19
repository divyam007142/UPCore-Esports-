const { EmbedBuilder } = require('discord.js');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_cancel_panel',
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${e('success') || '✅'}  Panel Resend Cancelled`)
      .setDescription('The existing support panel has been kept. No changes were made.')
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.update({ embeds: [embed], components: [] });
  },
};
