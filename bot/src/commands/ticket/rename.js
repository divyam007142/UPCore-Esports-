const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Rename this ticket channel (staff only)')
    .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true)),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'rename this ticket');
      return accessDeniedError(interaction);
    }

    if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
      return replyTicketError(interaction,
        `This ticket is claimed by <@${ticket.claimedBy}>. Only they can rename it — or they can \`/unclaim\` first.`,
        'warn'
      );
    }

    const raw     = interaction.options.getString('name');
    const newName = raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 100);
    const oldName = interaction.channel.name;

    await interaction.channel.setName(newName);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e('nick') || '✏️'}  Ticket Renamed`)
      .addFields(
        { name: `${e('case') || '🎫'}  Ticket`,     value: `\`${ticket.ticketId}\``, inline: true },
        { name: `${e('nick') || '🔤'}  Old Name`,   value: `\`${oldName}\``,         inline: true },
        { name: `${e('nick') || '🔤'}  New Name`,   value: `\`${newName}\``,         inline: true },
        { name: `${e('mod') || '🛡️'}  Renamed By`,  value: interaction.user.tag,     inline: true },
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_RENAME', {
      title: `Ticket Renamed  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,  value: `\`${ticket.ticketId}\``,                                  inline: true },
        { name: `${e('nick') || '🔤'}  Old`,     value: `\`${oldName}\``,                                          inline: true },
        { name: `${e('nick') || '🔤'}  New`,     value: `\`${newName}\``,                                          inline: true },
        { name: `${e('mod') || '🛡️'}  By`,       value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
      ],
    });
  },
};
