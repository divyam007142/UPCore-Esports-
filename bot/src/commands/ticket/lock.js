const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Ticket = require('../../models/Ticket');
const { isTicketAdmin, replyTicketError, ticketOwnerError, accessDeniedError } = require('../../utils/ticketPermissions');
const { logTicketAction } = require('../../utils/ticketLogger');
const { e } = require('../../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

function parseDuration(str) {
  const m = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return null;
  return parseInt(m[1]) * { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2].toLowerCase()];
}

function humanDuration(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

const LOCK_PERMS = { SendMessages: false, CreatePublicThreads: false, CreatePrivateThreads: false };

module.exports = {
  category: 'ticket',
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock this ticket so the user cannot send messages (staff only)')
    .addStringOption(o =>
      o.setName('duration').setDescription('Auto-unlock after e.g. 30m, 2h, 1d (omit for indefinite)').setRequired(false)
    ),

  async execute(interaction, client) {
    const ticket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
    if (!ticket) return replyTicketError(interaction, 'This command can only be used inside a ticket channel.', 'warn');

    if (!isTicketAdmin(interaction)) {
      if (ticket.userId === interaction.user.id) return ticketOwnerError(interaction, ticket, 'lock this ticket');
      return accessDeniedError(interaction);
    }

    if (ticket.locked) return replyTicketError(interaction, 'This ticket is already locked.', 'warn');

    const durStr = interaction.options.getString('duration');
    const durMs  = durStr ? parseDuration(durStr) : null;
    if (durStr && !durMs) return replyTicketError(interaction, 'Invalid duration. Use e.g. `30m`, `2h`, `1d`.', 'warn');

    const lockedAt      = IST();
    const expiresAt     = durMs ? Date.now() + durMs : null;
    const durationLabel = durMs ? humanDuration(durMs) : 'Indefinite';

    await interaction.channel.permissionOverwrites.edit(ticket.userId, LOCK_PERMS).catch(() => null);
    await Ticket.findOneAndUpdate({ channelId: interaction.channelId }, {
      locked: true, lockedBy: interaction.user.id, lockedAt, lockExpiresAt: expiresAt,
    }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${e('lock') || '🔐'}  Ticket Locked`)
      .setDescription(
        `This ticket has been locked${durMs ? ` for **${humanDuration(durMs)}**` : ' **indefinitely**'}.\n` +
        `The ticket creator can no longer send messages or create threads until it is unlocked.`
      )
      .addFields(
        { name: `${e('case') || '🎫'}  Ticket`,       value: `\`${ticket.ticketId}\``,      inline: true },
        { name: `${e('mod') || '🛡️'}  Locked By`,     value: `<@${interaction.user.id}>`,   inline: true },
        { name: `${e('clock') || '⏱️'}  Duration`,    value: durationLabel,                 inline: true },
        { name: `${e('calendar') || '📅'}  Locked At`, value: `\`${lockedAt}\``,             inline: true },
      )
      .setFooter({ text: 'UPCORE Esports  •  Support System' });

    await interaction.reply({ embeds: [embed] });

    if (durMs) {
      const channelId = interaction.channelId;
      const userId    = ticket.userId;
      setTimeout(async () => {
        const cur = await Ticket.findOne({ channelId }).catch(() => null);
        if (!cur?.locked) return;
        const ch = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => null);
        if (!ch) return;
        await ch.permissionOverwrites.edit(userId, { SendMessages: null, CreatePublicThreads: null, CreatePrivateThreads: null }).catch(() => null);
        await Ticket.findOneAndUpdate({ channelId }, { locked: false, lockedBy: null, lockedAt: null, lockExpiresAt: null });
        const autoEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle(`${e('unlock') || '🔓'}  Ticket Auto-Unlocked`)
          .setDescription(`The lock duration (**${humanDuration(durMs)}**) has expired. This ticket is now unlocked.`)
          .setFooter({ text: 'UPCORE Esports  •  Support System' });
        await ch.send({ embeds: [autoEmbed] }).catch(() => null);
      }, durMs);
    }

    await logTicketAction(client, 'TICKET_LOCK', {
      title: `Ticket Locked  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,    value: `<#${interaction.channelId}>\n\`${ticket.ticketId}\``,   inline: true },
        { name: `${e('member') || '👤'}  Owner`,    value: `<@${ticket.userId}>`,                                   inline: true },
        { name: `${e('mod') || '🛡️'}  By`,         value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``, inline: true },
        { name: `${e('clock') || '⏱️'}  Duration`,  value: durationLabel,                                           inline: true },
      ],
    });
  },
};
