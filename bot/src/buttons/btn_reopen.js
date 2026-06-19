const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../utils/ticketPermissions');
const { logTicketAction } = require('../utils/ticketLogger');
const { e } = require('../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  id: 'btn_reopen',
  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This is not a ticket channel.', 'warn');
    if (ticket.status === 'open') return replyTicketError(interaction, 'This ticket is already open.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'reopen this ticket');
      return accessDeniedError(interaction);
    }

    await interaction.deferUpdate();
    const reopenedAt = IST();
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { status: 'open', closedAt: null, closedBy: null });
    await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setAuthor({ name: 'UPCORE Esports  •  Ticket System', iconURL: interaction.client.user.displayAvatarURL() })
      .setTitle(`${e('unlock') || '🔓'}  Ticket Reopened — ${ticket.ticketId}`)
      .setDescription(`The ticket has been reopened by <@${interaction.user.id}>. Please continue your conversation.`)
      .addFields(
        { name: `${e('mod') || '🛡️'}  Reopened By`,    value: `<@${interaction.user.id}>`, inline: true },
        { name: `${e('calendar') || '📅'}  At`,          value: `\`${reopenedAt}\``, inline: true },
      )
      .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

    // Build buttons with app emojis
    const addBtn = new ButtonBuilder().setCustomId('btn_add').setLabel('Add User').setStyle(ButtonStyle.Secondary);
    const closeBtn = new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setStyle(ButtonStyle.Danger);
    const claimBtn = new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim').setStyle(ButtonStyle.Primary);

    const addE   = e('member') || '➕';
    const lockE  = e('lock')   || '🔒';
    const modE   = e('mod')    || '🙋';
    if (addE)  addBtn.setEmoji(addE);
    if (lockE) closeBtn.setEmoji(lockE);
    if (modE)  claimBtn.setEmoji(modE);

    const row = new ActionRowBuilder().addComponents(addBtn, closeBtn, claimBtn);
    await interaction.channel.send({ embeds: [embed], components: [row] });

    await logTicketAction(client, 'TICKET_OPEN', {
      title: `Ticket Reopened  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,       value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``, inline: true },
        { name: `${e('member') || '👤'}  Owner`,       value: `<@${ticket.userId}>`, inline: true },
        { name: `${e('mod') || '🛡️'}  Reopened By`,   value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        { name: `${e('calendar') || '📅'}  At`,        value: `\`${reopenedAt}\``, inline: true },
      ],
    });
  },
};
