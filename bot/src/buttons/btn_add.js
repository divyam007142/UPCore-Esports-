const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../utils/ticketPermissions');

module.exports = {
  id: 'btn_add',
  async execute(interaction) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This is not a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'add users to this ticket');
      return accessDeniedError(interaction);
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_add_user')
      .setTitle('Add User to Ticket');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('user_id')
          .setLabel('Discord User ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Right-click a user → Copy ID  (e.g. 123456789012345678)')
          .setMinLength(17)
          .setMaxLength(20)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },
};
