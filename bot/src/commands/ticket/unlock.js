const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

const UNLOCK_PERMS = { SendMessages: null, CreatePublicThreads: null, CreatePrivateThreads: null };

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock this ticket (staff only)'),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'unlock this ticket');
      return accessDeniedError(interaction);
    }

    if (!ticket.locked) return replyTicketError(interaction, 'This ticket is not currently locked.', 'warn');

    await interaction.channel.permissionOverwrites.edit(ticket.userId, UNLOCK_PERMS).catch(() => null);
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { locked: false, lockedBy: null, lockedAt: null, lockExpiresAt: null }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`${e('unlock') || '🔓'}  Ticket Unlocked`)
      .setDescription('This ticket has been unlocked. The user can now send messages again.')
      .addFields(
        { name: `${e('case') || '🎫'}  Ticket`,    value: `\`${ticket.ticketId}\``, inline: true },
        { name: `${e('mod') || '🛡️'}  Unlocked By`, value: interaction.user.tag,   inline: true },
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_UNLOCK', {
      title: `Ticket Unlocked  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,  value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,                inline: true },
        { name: `${e('member') || '👤'}  Owner`,  value: `<@${ticket.userId}>`,                                               inline: true },
        { name: `${e('mod') || '🛡️'}  By`,       value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``,            inline: true },
      ],
    });
  },
};
