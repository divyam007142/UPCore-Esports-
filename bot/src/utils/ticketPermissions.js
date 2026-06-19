const { EmbedBuilder } = require('discord.js');
const { e } = require('./emoji');

function isTicketAdmin(interaction) {
  if (!interaction.guild) return false;
  if (interaction.user.id === interaction.guild.ownerId) return true;
  if (interaction.memberPermissions?.has('Administrator')) return true;
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  if (adminRoleId && interaction.member?.roles?.cache?.has(adminRoleId)) return true;
  const supportRoleId = process.env.TICKET_SUPPORT_ROLE_ID;
  if (supportRoleId && interaction.member?.roles?.cache?.has(supportRoleId)) return true;
  return false;
}

async function replyTicketError(interaction, message, type = 'denied') {
  const configs = {
    denied: { color: 0xED4245, icon: e('error') || '❌' },
    warn:   { color: 0xFEE75C, icon: e('warning') || '⚠️' },
    info:   { color: 0x3498DB, icon: e('info') || 'ℹ️' },
  };
  const { color, icon } = configs[type] ?? configs.denied;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(`${icon}  **${message}**`)
    .setFooter({ text: 'UPCORE Esports  •  Support System' });

  return _send(interaction, { embeds: [embed], ephemeral: true });
}

async function ticketOwnerError(interaction, ticket, actionLabel) {
  const staffMention = process.env.TICKET_SUPPORT_ROLE_ID
    ? `<@&${process.env.TICKET_SUPPORT_ROLE_ID}>`
    : 'a support staff member';

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(`${e('warning') || '⚠️'}  Staff-Only Action`)
    .setDescription(
      `Hey <@${interaction.user.id}>! You opened this ticket, but **${actionLabel}** is a staff-only action.\n\n` +
      `> If your issue has been resolved, ask ${staffMention} to close it.\n` +
      `> For urgent help, mention staff directly in this channel.`
    )
    .addFields(
      { name: `${e('case') || '🎫'}  Ticket`,        value: `\`${ticket?.ticketId ?? '—'}\``, inline: true },
      { name: `${e('member') || '👤'}  Your Role`,   value: '`Ticket Creator`',               inline: true },
      { name: `${e('mod') || '🛡️'}  Who Can Do This`, value: '`Support Staff`',               inline: true },
    )
    .setFooter({ text: 'UPCORE Esports  •  Support System' })
    .setTimestamp();

  return _send(interaction, { embeds: [embed], ephemeral: true });
}

async function accessDeniedError(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`${e('shield') || '🛡️'}  Access Denied`)
    .setDescription(
      `> ${e('error') || '❌'}  This action is restricted to **UPCORE Support Staff** only.\n` +
      `> You do not have the required role to perform this operation.`
    )
    .addFields(
      { name: `${e('key') || '🔑'}  Required`,      value: '`Support Staff Role`', inline: true },
      { name: `${e('member') || '👤'}  Your Status`, value: '`Member`',            inline: true },
    )
    .setFooter({ text: 'UPCORE Esports  •  Contact a staff member if you need help' })
    .setTimestamp();

  return _send(interaction, { embeds: [embed], ephemeral: true });
}

async function _send(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch { /* interaction expired or already replied */ }
}

module.exports = { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError };
