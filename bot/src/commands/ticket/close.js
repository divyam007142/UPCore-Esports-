const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket (staff only)'),

  async execute(interaction) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    // Orphaned channel: status is closed but channel still exists — let staff clean it up
    if (ticket.status === 'closed') {
      if (!isTicketAdmin(interaction)) return replyTicketError(interaction, 'This ticket is already closed.', 'warn');

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e('warning') || '⚠️'}  Already Closed`)
        .setDescription(
          `Ticket **${ticket.ticketId}** is already marked as closed in the database.\n\n` +
          `This appears to be an **orphaned channel** — the ticket was closed but the channel was not deleted.\n` +
          `Click **Delete Channel** to clean it up.`
        )
        .setFooter({ text: 'UPCORE Esports  •  Support System' });

      const deleteBtn = new ButtonBuilder()
        .setCustomId('btn_confirm_close')
        .setLabel('Delete Channel')
        .setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder()
        .setCustomId('btn_cancel_close')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const purgeE = e('purge') || '🗑️';
      const crossE = e('cross') || '✖️';
      if (purgeE) deleteBtn.setEmoji(purgeE);
      if (crossE) cancelBtn.setEmoji(crossE);

      const row = new ActionRowBuilder().addComponents(deleteBtn, cancelBtn);
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'close this ticket');
      return accessDeniedError(interaction);
    }

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${e('warning') || '⚠️'}  Close Ticket?`)
      .setDescription(
        `Are you sure you want to close **${ticket.ticketId}**?\n\n` +
        `> ${e('reminder') || '📧'}  The user will receive a transcript via DM.\n` +
        `> ${e('purge') || '🗑️'}  The channel will be deleted after closing.`
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    const confirmBtn = new ButtonBuilder().setCustomId('btn_confirm_close').setLabel('Yes, Close').setStyle(ButtonStyle.Danger);
    const cancelBtn  = new ButtonBuilder().setCustomId('btn_cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
    const lockE  = e('lock')  || '🔒';
    const crossE = e('cross') || '✖️';
    if (lockE)  confirmBtn.setEmoji(lockE);
    if (crossE) cancelBtn.setEmoji(crossE);
    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
