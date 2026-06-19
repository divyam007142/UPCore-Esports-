const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('special')
    .setDescription('Move this ticket to the Special category (staff only)'),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction))
      return replyTicketError(interaction, 'Only ticket staff can move tickets to the Special category.', 'denied');

    const categoryId = process.env.Special_Ticket_Category_ID;
    if (!categoryId)
      return replyTicketError(interaction, '`Special_Ticket_Category_ID` is not configured. Ask an admin to set it.', 'warn');

    const category = interaction.guild.channels.cache.get(categoryId);
    if (!category || category.type !== 4)
      return replyTicketError(interaction, 'Special category not found or is not a valid category channel.', 'warn');

    if (interaction.channel.parentId === categoryId)
      return replyTicketError(interaction, 'This ticket is already in the Special category.', 'warn');

    if (ticket.status === 'closed')
      return replyTicketError(interaction, 'Cannot move a closed ticket.', 'warn');

    await interaction.channel.setParent(categoryId, { lockPermissions: false }).catch(() => null);

    const now = IST();
    await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId },
      {
        isSpecial: true,
        specialAt: now,
        specialBy: interaction.user.id,
        $push: {
          categoryHistory: {
            action:   'moved_to_special',
            category: 'special',
            movedBy:  interaction.user.id,
            movedAt:  now,
          },
        },
      }
    ).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${e('star') || '⭐'}  Moved to Special Category`)
      .setDescription(
        `This ticket has been escalated to the **Special** category.\n` +
        `A senior staff member will review it shortly.`
      )
      .addFields(
        { name: `${e('case')   || '🎫'}  Ticket`,    value: `\`${ticket.ticketId}\``,      inline: true },
        { name: `${e('mod')    || '🛡️'}  Moved By`,  value: `<@${interaction.user.id}>`,   inline: true },
        { name: `${e('folder') || '📁'}  Category`,  value: `\`${category.name}\``,        inline: true },
        { name: `${e('calendar') || '📅'}  Moved At`, value: `\`${now}\``,                 inline: true },
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_SPECIAL', {
      title: `Moved to Special  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case')   || '🎫'}  Ticket`,    value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,     inline: true },
        { name: `${e('member') || '👤'}  Owner`,      value: `<@${ticket.userId}>`,                                    inline: true },
        { name: `${e('mod')    || '🛡️'}  By`,        value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        { name: `${e('folder') || '📁'}  Category`,  value: `\`${category.name}\``,                                   inline: true },
        { name: `${e('calendar') || '📅'}  At`,       value: `\`${now}\``,                                             inline: true },
      ],
    });
  },
};
