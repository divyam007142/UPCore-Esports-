const { EmbedBuilder } = require('discord.js');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_ticket_upload',
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e('screenshot') || '📸'}  How to Upload Your File`)
      .setDescription(
        `**Simply send your file as a message in this ticket channel.**\n\n` +
        `> ${e('note') || '📎'}  Click the **+** icon (or paperclip) next to the message box\n` +
        `> ${e('check') || '✅'}  Select your screenshot / file from your device\n` +
        `> ${e('info') || 'ℹ️'}  Add a caption if needed, then hit **Send**\n\n` +
        `Our staff will review your attachment as soon as possible.`
      )
      .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
