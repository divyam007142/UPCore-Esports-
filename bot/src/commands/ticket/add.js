const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to this ticket (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'add users to this ticket');
      return accessDeniedError(interaction);
    }

    const user = interaction.options.getUser('user');

    if (user.bot) {
      return replyTicketError(interaction, 'Bots cannot be added to a ticket.', 'warn');
    }

    if (user.id === ticket.userId) {
      return replyTicketError(interaction, `<@${user.id}> is the ticket owner — they already have full access to this ticket.`, 'warn');
    }

    const overwrite = interaction.channel.permissionOverwrites.cache.get(user.id);
    if (overwrite) {
      return replyTicketError(interaction, `<@${user.id}> is already in this ticket and can view it.`, 'warn');
    }

    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    }).catch(() => null);

    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { $addToSet: { addedUsers: user.id } }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setDescription(`${e('success')}  <@${user.id}> has been added to this ticket and can now view and send messages here.`)
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_ADD', {
      title: `User Added to Ticket  •  ${ticket.ticketId}`,
      thumbnail: user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,      value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,                inline: true },
        { name: `${e('member') || '👤'}  User Added`, value: `<@${user.id}>\n\`${user.tag}\``,                                   inline: true },
        { name: `${e('mod') || '🛡️'}  By`,           value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``,            inline: true },
      ],
    });
  },
};
