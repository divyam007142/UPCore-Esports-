const { sendPanel, deleteOldPanel } = require('../utils/ticketPanel');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_confirm_panel',
  async execute(interaction, client) {
    await interaction.deferUpdate();
    await deleteOldPanel(client, interaction.guild.id);
    const msg = await sendPanel(client, interaction.guild.id);
    const channelId = process.env.TICKET_PANEL_ID;
    await interaction.editReply({
      content: `${e('success') || '✅'} Support panel has been sent to <#${channelId}>.`,
      embeds: [],
      components: [],
    });
  },
};
