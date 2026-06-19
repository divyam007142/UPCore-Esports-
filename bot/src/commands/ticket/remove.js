const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from this ticket (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'remove users from this ticket');
      return accessDeniedError(interaction);
    }

    const user = interaction.options.getUser('user');

    if (user.id === ticket.userId) {
      return replyTicketError(interaction, `<@${user.id}> is the ticket owner and cannot be removed from their own ticket.`, 'warn');
    }

    if (user.id === interaction.user.id) {
      return replyTicketError(interaction, 'You cannot remove yourself from this ticket using this command.', 'warn');
    }

    const overwrite = interaction.channel.permissionOverwrites.cache.get(user.id);
    if (!overwrite) {
      return replyTicketError(interaction, `<@${user.id}> is not in this ticket — they have no access to remove.`, 'warn');
    }

    await interaction.channel.permissionOverwrites.delete(user.id).catch(() => null);
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { $pull: { addedUsers: user.id } }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setDescription(`${e('cross')}  <@${user.id}> has been removed from this ticket and can no longer view or send messages here.`)
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_REMOVE', {
      title: `User Removed from Ticket  •  ${ticket.ticketId}`,
      thumbnail: user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,         value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,   inline: true },
        { name: `${e('member') || '👤'}  User Removed`,  value: `<@${user.id}>\n\`${user.tag}\``,                       inline: true },
        { name: `${e('mod') || '🛡️'}  By`,              value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
      ],
    });
  },
};
