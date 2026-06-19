const { EmbedBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../utils/ticketPermissions');
const { logTicketAction } = require('../utils/ticketLogger');
const { e } = require('../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  id: 'btn_lock',
  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This is not a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'lock / unlock this ticket');
      return accessDeniedError(interaction);
    }

    const isLocked = ticket.locked;

    if (isLocked) {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: null, CreatePublicThreads: null, CreatePrivateThreads: null }).catch(() => null);
      await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { locked: false, lockedBy: null, lockedAt: null });

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setAuthor({ name: 'UPCORE Esports  •  Ticket System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle(`${e('unlock') || '🔓'}  Ticket Unlocked`)
        .setDescription(`<@${interaction.user.id}> has unlocked this ticket. The user can now send messages again.`)
        .addFields({ name: `${e('mod') || '🛡️'}  Unlocked By`, value: `<@${interaction.user.id}>`, inline: true })
        .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

      await interaction.reply({ embeds: [embed] });
      await logTicketAction(client, 'TICKET_UNLOCK', {
        title: `Ticket Unlocked  •  ${ticket.ticketId}`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: `${e('case') || '🎫'}  Ticket`,  value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``, inline: true },
          { name: `${e('member') || '👤'}  Owner`,  value: `<@${ticket.userId}>`, inline: true },
          { name: `${e('mod') || '🛡️'}  By`,       value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        ],
      });
    } else {
      const lockedAt = IST();
      await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false, CreatePublicThreads: false, CreatePrivateThreads: false }).catch(() => null);
      await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, { locked: true, lockedBy: interaction.user.id, lockedAt });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({ name: 'UPCORE Esports  •  Ticket System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle(`${e('lock') || '🔐'}  Ticket Locked`)
        .setDescription(`<@${interaction.user.id}> has locked this ticket. The user cannot send messages until staff unlocks it.`)
        .addFields({ name: `${e('mod') || '🛡️'}  Locked By`, value: `<@${interaction.user.id}>`, inline: true })
        .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

      await interaction.reply({ embeds: [embed] });
      await logTicketAction(client, 'TICKET_LOCK', {
        title: `Ticket Locked  •  ${ticket.ticketId}`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: `${e('case') || '🎫'}  Ticket`,  value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``, inline: true },
          { name: `${e('member') || '👤'}  Owner`,  value: `<@${ticket.userId}>`, inline: true },
          { name: `${e('mod') || '🛡️'}  By`,       value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        ],
      });
    }
  },
};
