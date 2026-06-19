const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, accessDeniedError } = require('../utils/ticketPermissions');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_close',
  async execute(interaction) {
    // Acknowledge immediately — DB queries below can exceed Discord's 3 s window
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This is not a ticket channel.', 'warn', true);

    // Orphaned channel: status is closed but channel still exists — let staff clean it up
    if (ticket.status === 'closed') {
      if (!isTicketAdmin(interaction)) return replyTicketError(interaction, 'This ticket is already closed.', 'warn', true);

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
      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) {
        return replyTicketError(interaction, 'Only support staff can close tickets. Ask a staff member to close it for you.', 'warn', true);
      }
      return accessDeniedError(interaction, true);
    }

    const warnE  = e('warning') || '⚠️';
    const lockE  = e('lock')    || '🔒';
    const crossE = e('cross')   || '✖️';

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${warnE}  Close Ticket?`)
      .setDescription(
        `Are you sure you want to close **${ticket.ticketId}**?\n\n` +
        `> ${e('reminder') || '📧'}  The user will receive a transcript via DM.\n` +
        `> ${e('purge') || '🗑️'}  This channel will be deleted after closing.`
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    const confirmBtn = new ButtonBuilder()
      .setCustomId('btn_confirm_close')
      .setLabel('Yes, Close')
      .setStyle(ButtonStyle.Danger);
    if (lockE) confirmBtn.setEmoji(lockE);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('btn_cancel_close')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);
    if (crossE) cancelBtn.setEmoji(crossE);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
