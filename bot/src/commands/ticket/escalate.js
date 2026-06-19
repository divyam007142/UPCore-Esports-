const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

const CATEGORY_ENV = {
  general:    'TICKET_CATEGORY_ID1',
  tournament: 'TICKET_CATEGORY_ID2',
  club:       'TICKET_CATEGORY_ID3',
  business:   'TICKET_CATEGORY_ID4',
  others:     'TICKET_CATEGORY_ID5',
};

const CATEGORY_LABELS = {
  general:    'General Support',
  tournament: 'Tournament / Event Support',
  club:       'Club Join Request',
  business:   'Business Enquiries',
  others:     'Others',
};

/**
 * Resolves the original Discord category channel for a ticket.
 * Prefers the saved originalCategoryId (set at ticket creation),
 * falls back to deriving it from the CATEGORY_ENV map for older tickets.
 */
function getOriginalCategoryId(ticket) {
  if (ticket.originalCategoryId) return ticket.originalCategoryId;
  const envKey = CATEGORY_ENV[ticket.category];
  return envKey ? process.env[envKey] : null;
}

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('escalate')
    .setDescription('Move this ticket from Special back to its original category (staff only)'),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction))
      return replyTicketError(interaction, 'Only ticket staff can escalate tickets.', 'denied');

    if (ticket.status === 'closed')
      return replyTicketError(interaction, 'Cannot escalate a closed ticket.', 'warn');

    // Resolve the original (home) category for this ticket
    // Prefers the channel ID saved in MongoDB at creation; falls back to env var for old tickets
    const originalCatId = getOriginalCategoryId(ticket);

    if (!originalCatId)
      return replyTicketError(interaction, `Original category for \`${ticket.category}\` could not be resolved. Check env vars.`, 'warn');

    const originalCategory = interaction.guild.channels.cache.get(originalCatId);
    if (!originalCategory || originalCategory.type !== 4)
      return replyTicketError(interaction, 'Original category channel not found or is not a valid category.', 'warn');

    // If the ticket is already sitting in its original category, block the command
    if (interaction.channel.parentId === originalCatId) {
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e('warning') || '⚠️'}  Already in Original Category`)
        .setDescription(
          `Ticket **${ticket.ticketId}** is already in its original category — **${originalCategory.name}**.\n\n` +
          `${e('info') || 'ℹ️'}  \`/escalate\` is used to move a ticket **from the Special category** back to its original category.\n` +
          `If you want to move it to Special, use \`/special\` instead.`
        )
        .addFields(
          { name: `${e('case') || '🎫'}  Ticket`,          value: `\`${ticket.ticketId}\``,                              inline: true },
          { name: `${e('folder') || '📁'}  Current Category`, value: `\`${originalCategory.name}\``,                     inline: true },
          { name: `${e('log') || '🗂️'}  Type`,              value: `\`${CATEGORY_LABELS[ticket.category] ?? ticket.category}\``, inline: true },
        )
        .setFooter({ text: 'UPCORE Esports  •  Support System  •  Use /special to move to Special' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if the ticket is in the special category
    const specialCatId = process.env.Special_Ticket_Category_ID;
    if (specialCatId && interaction.channel.parentId !== specialCatId) {
      // Ticket is neither in original nor in special — warn but still allow the move
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e('warning') || '⚠️'}  Not in Special Category`)
        .setDescription(
          `Ticket **${ticket.ticketId}** is not currently in the Special category.\n\n` +
          `\`/escalate\` is intended to move tickets **from Special → Original**.\n` +
          `This ticket appears to have been moved elsewhere. Moving it to the original category anyway.`
        )
        .setFooter({ text: 'UPCORE Esports  •  Support System' });
      await interaction.channel.send({ embeds: [embed] }).catch(() => null);
    }

    // Move back to original category
    await interaction.channel.setParent(originalCatId, { lockPermissions: false }).catch(() => null);

    const now      = IST();
    const catLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;

    await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId },
      {
        isEscalated: true,
        escalatedAt: now,
        escalatedBy: interaction.user.id,
        isSpecial:   false,
        $push: {
          categoryHistory: {
            action:   'escalated_back',
            category: ticket.category,
            movedBy:  interaction.user.id,
            movedAt:  now,
          },
        },
      }
    ).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e('case') || '🎫'}  Ticket Escalated Back`)
      .setDescription(
        `This ticket has been moved back to its original category.\n` +
        `${e('mod') || '🛡️'}  Staff will continue to assist from here.`
      )
      .addFields(
        { name: `${e('case')     || '🎫'}  Ticket`,      value: `\`${ticket.ticketId}\``,      inline: true },
        { name: `${e('mod')      || '🛡️'}  Moved By`,    value: `<@${interaction.user.id}>`,   inline: true },
        { name: `${e('folder')   || '📁'}  Category`,    value: `\`${originalCategory.name}\``, inline: true },
        { name: `${e('log')      || '🗂️'}  Ticket Type`, value: `\`${catLabel}\``,              inline: true },
        { name: `${e('calendar') || '📅'}  At`,          value: `\`${now}\``,                   inline: true },
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    await logTicketAction(client, 'TICKET_ESCALATE', {
      title: `Ticket Escalated Back  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case')   || '🎫'}  Ticket`,    value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,    inline: true },
        { name: `${e('member') || '👤'}  Owner`,     value: `<@${ticket.userId}>`,                                    inline: true },
        { name: `${e('mod')    || '🛡️'}  By`,        value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        { name: `${e('folder') || '📁'}  Category`,  value: `\`${originalCategory.name}\``,                           inline: true },
        { name: `${e('calendar') || '📅'}  At`,       value: `\`${now}\``,                                             inline: true },
      ],
    });
  },
};
