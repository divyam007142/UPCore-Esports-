const { AttachmentBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../utils/ticketPermissions');
const { generateTranscript } = require('../utils/transcript');
const { logTicketAction } = require('../utils/ticketLogger');
const { e } = require('../utils/emoji');

module.exports = {
  id: 'btn_delete',
  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This is not a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'delete this ticket channel');
      return accessDeniedError(interaction);
    }

    await interaction.reply({ content: `${e('purge') || '🗑️'}  Deleting channel in 5 seconds — transcript will be saved.` });

    const buf  = await generateTranscript(interaction.channel, ticket);
    const file = new AttachmentBuilder(buf, { name: `${ticket.ticketId}.html` });

    const logCh = await client.channels.fetch(process.env.TICKET_LOG_CHANNEL_ID).catch(() => null);
    if (logCh) {
      await logCh.send({ content: `${e('note') || '📄'}  Transcript for deleted ticket **${ticket.ticketId}**:`, files: [file] }).catch(() => null);
    }

    await Ticket.findOneAndDelete({ channelId: interaction.channelId }).catch(() => null);

    await logTicketAction(client, 'TICKET_DELETE', {
      title: `Ticket Deleted  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket ID`,   value: `\`${ticket.ticketId}\``,                                  inline: true },
        { name: `${e('member') || '👤'}  Owner`,      value: `<@${ticket.userId}>\n\`${ticket.username}\``,            inline: true },
        { name: `${e('mod') || '🛡️'}  Deleted By`,   value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
      ],
    });

    setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
  },
};
