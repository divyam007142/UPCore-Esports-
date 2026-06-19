const { EmbedBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError } = require('../utils/ticketPermissions');
const { e } = require('../utils/emoji');
const { logTicketAction } = require('../utils/ticketLogger');

function errorEmbed(message, type = 'warn') {
  const config = {
    error: { color: 0xED4245, icon: 'error' },
    warn:  { color: 0xFEE75C, icon: 'warning' },
  };
  const { color, icon } = config[type] ?? config.warn;
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${e(icon)}  **${message}**`)
    .setFooter({ text: 'UPCORE Esports  •  Support System' });
}

module.exports = {
  id: 'modal_add_user',
  async execute(interaction, client) {
    if (!isTicketAdmin(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Only support staff can add users to tickets.', 'error')],
        ephemeral: true,
      });
    }

    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('This is not a ticket channel.', 'warn')],
        ephemeral: true,
      });
    }

    const rawId = interaction.fields.getTextInputValue('user_id').trim().replace(/[<@!>]/g, '');

    if (!/^\d{17,20}$/.test(rawId)) {
      return interaction.reply({
        embeds: [errorEmbed('That doesn\'t look like a valid Discord User ID. IDs are 17–20 digits — right-click a user and copy their ID.', 'warn')],
        ephemeral: true,
      });
    }

    let user;
    try {
      user = await client.users.fetch(rawId);
    } catch {
      return interaction.reply({
        embeds: [errorEmbed('No Discord account found with that ID. Double-check the ID and try again.', 'error')],
        ephemeral: true,
      });
    }

    if (user.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Bots cannot be added to a ticket.', 'warn')],
        ephemeral: true,
      });
    }

    if (user.id === ticket.userId) {
      return interaction.reply({
        embeds: [errorEmbed(`<@${user.id}> is the ticket owner — they already have full access to this ticket.`, 'warn')],
        ephemeral: true,
      });
    }

    const overwrite = interaction.channel.permissionOverwrites.cache.get(user.id);
    if (overwrite) {
      return interaction.reply({
        embeds: [errorEmbed(`<@${user.id}> is already in this ticket and can view it.`, 'warn')],
        ephemeral: true,
      });
    }

    await interaction.channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    }).catch(() => null);

    await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId },
      { $addToSet: { addedUsers: user.id } }
    ).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setDescription(`${e('success')}  <@${user.id}> has been added to this ticket and can now view and send messages here.`)
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_ADD', {
      title: `User Added to Ticket  •  ${ticket.ticketId}`,
      thumbnail: user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,       value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,    inline: true },
        { name: `${e('member') || '👤'}  User Added`,  value: `<@${user.id}>\n\`${user.tag}\``,                        inline: true },
        { name: `${e('mod') || '🛡️'}  By`,            value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
      ],
    });
  },
};
