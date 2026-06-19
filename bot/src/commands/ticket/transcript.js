const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { generateTranscript } = require('../../utils/transcript');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Generate a transcript of this ticket (staff only)'),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'generate a transcript');
      return accessDeniedError(interaction);
    }

    await interaction.deferReply({ ephemeral: true });

    const buf  = await generateTranscript(interaction.channel, ticket);
    const file = new AttachmentBuilder(buf, { name: `${ticket.ticketId}.html` });

    await interaction.editReply({ content: `${e('screenshot') || '📄'} Here is the transcript for **${ticket.ticketId}**:`, files: [file] });

    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { transcriptGeneratedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) });

    await logTicketAction(client, 'TICKET_TRANSCRIPT', {
      title: `Transcript Generated  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,  value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``, inline: true },
        { name: `${e('member') || '👤'}  Owner`,  value: `<@${ticket.userId}>`,                               inline: true },
        { name: `${e('mod') || '🛡️'}  By`,       value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
      ],
    });
  },
};
