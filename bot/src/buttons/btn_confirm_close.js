const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const { isTicketAdmin, replyTicketError, accessDeniedError } = require('../utils/ticketPermissions');
const { generateTranscript } = require('../utils/transcript');
const { logTicketAction, categoryLabel } = require('../utils/ticketLogger');
const { e } = require('../utils/emoji');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

function formatDuration(ms) {
  const totalSecs = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length || s) parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = {
  id: 'btn_confirm_close',
  async execute(interaction, client) {
    if (!isTicketAdmin(interaction)) return accessDeniedError(interaction);

    // Dismiss the ephemeral confirmation immediately
    await interaction.deferUpdate();

    // Atomically mark as closed — only succeeds if ticket is still open.
    // This prevents double-close races (e.g. double-click or orphaned channel).
    const closedAt = IST();
    const ticket = await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId, status: 'open' },
      { status: 'closed', closedAt, closedBy: interaction.user.id, claimedBy: null, locked: false },
      { new: false }   // return the pre-update doc so we have full ticket data
    ).catch(() => null);

    if (!ticket) {
      // Either not a ticket channel, or already closed (orphaned channel).
      const orphanTicket = await Ticket.findOne({ channelId: interaction.channelId }).catch(() => null);
      if (orphanTicket && orphanTicket.status === 'closed') {
        // Edit the public confirmation to an orphan cleanup notice, then delete after delay
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription(
              `${e('warning') || '⚠️'}  **Ticket \`${orphanTicket.ticketId}\` is already closed in the database.**\n\n` +
              `This is an orphaned channel — it will be deleted in 5 seconds.`
            )
            .setFooter({ text: 'UPCORE Esports  •  Support System' })],
          components: [],
        }).catch(() => null);
        setTimeout(() => interaction.channel.delete().catch(() => null), 5_000);
      } else {
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription(`${e('warning') || '⚠️'}  **This is not a recognized ticket channel.**`)
            .setFooter({ text: 'UPCORE Esports  •  Support System' })],
          components: [],
        }).catch(() => null);
      }
      return;
    }

    // ── Update the public close confirmation → "Closing…" (removes buttons) ──
    const closingEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setDescription(
        `${e('lock') || '🔒'}  **Closing ticket ${ticket.ticketId}…**\n` +
        `<@${interaction.user.id}> is closing this ticket. Please wait a moment.`
      );
    await interaction.editReply({ embeds: [closingEmbed], components: [] }).catch(() => null);

    await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => null);

    const openMs    = ticket.createdAt ? new Date(ticket.createdAt).getTime() : null;
    const duration  = openMs ? formatDuration(Date.now() - openMs) : null;

    const buf = await generateTranscript(interaction.channel, { ...ticket.toObject(), status: 'closed', closedAt, duration });

    // Save transcript generated timestamp
    await Ticket.findOneAndUpdate(
      { channelId: interaction.channelId },
      { transcriptGeneratedAt: closedAt }
    ).catch(() => null);

    // ── DM the ticket creator ────────────────────────────────────────────────
    try {
      const creator = await client.users.fetch(ticket.userId);

      const dmClosedImg    = new AttachmentBuilder(path.join(__dirname, '../../assets/ticket-closed-dm.png'), { name: 'ticket-closed-dm.png' });
      const transcriptFile = new AttachmentBuilder(buf, { name: `${ticket.ticketId}.html` });

      const dmEmbed = new EmbedBuilder()
        .setColor(0x000000)
        .setAuthor({ name: 'UPCORE Esports  •  Support Center', iconURL: client.user.displayAvatarURL() })
        .setTitle(`${e('lock') || '🔒'}  Your Ticket Has Been Closed`)
        .setDescription(
          `Your ticket **${ticket.ticketId}** has been closed.\n\n` +
          `${e('check') || '✅'}  We hope your issue has been resolved!\n` +
          `${e('case') || '🎫'}  Open a new ticket if you need further assistance.`
        )
        .addFields(
          { name: `${e('case') || '🎫'}  Ticket ID`,    value: `\`${ticket.ticketId}\``,                inline: true },
          { name: `${e('mod') || '🛡️'}  Closed By`,     value: `<@${interaction.user.id}>`,             inline: true },
          { name: `${e('calendar') || '📅'}  Closed At`, value: `\`${closedAt}\``,                       inline: true },
          { name: `${e('log') || '🗂️'}  Category`,       value: `\`${categoryLabel(ticket.category)}\``, inline: true },
        )
        .setImage('attachment://ticket-closed-dm.png')
        .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' })
        .setTimestamp();

      await creator.send({ embeds: [dmEmbed], files: [dmClosedImg, transcriptFile] });
    } catch { /* DMs disabled — silently skip */ }

    // ── Remove the "Closing…" message before posting the thank-you ───────────
    await interaction.deleteReply().catch(() => null);

    // ── Thank-you message in channel ─────────────────────────────────────────
    const thankyouImg = new AttachmentBuilder(path.join(__dirname, '../../assets/thankyou.png'), { name: 'thankyou.png' });
    const thankyouEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'UPCORE Esports  •  Support Center', iconURL: client.user.displayAvatarURL() })
      .setDescription(
        `${e('check') || '✅'}  Thank you <@${ticket.userId}> for reaching out to UPCORE Support!\n` +
        `Your ticket **${ticket.ticketId}** has been closed.\n\n` +
        `**Closed by:** <@${interaction.user.id}>  •  **At:** \`${closedAt}\``
      )
      .setImage('attachment://thankyou.png')
      .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

    await interaction.channel.send({ embeds: [thankyouEmbed], files: [thankyouImg] });

    // ── Deletion notice ───────────────────────────────────────────────────────
    const closedImg   = new AttachmentBuilder(path.join(__dirname, '../../assets/ticket-closed.png'), { name: 'ticket-closed.png' });
    const closedEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setDescription(`${e('purge') || '🗑️'}  This channel will be **deleted in 10 seconds**.`)
      .setImage('attachment://ticket-closed.png');

    await interaction.channel.send({ embeds: [closedEmbed], files: [closedImg] });

    // ── Log + transcript to log channel ──────────────────────────────────────
    const specialNote = ticket.isSpecial
      ? [{ name: `${e('star') || '⭐'}  Special Ticket`, value: `Moved to special by <@${ticket.specialBy}> at \`${ticket.specialAt}\``, inline: false }]
      : [];
    const escalatedNote = ticket.isEscalated
      ? [{ name: `${e('case') || '🎫'}  Escalated`, value: `Escalated by <@${ticket.escalatedBy}> at \`${ticket.escalatedAt}\``, inline: false }]
      : [];

    await logTicketAction(client, 'TICKET_CLOSE', {
      title: `Ticket Closed  •  ${ticket.ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket`,       value: `\`${ticket.ticketId}\``,                                    inline: true },
        { name: `${e('member') || '👤'}  Owner`,       value: `<@${ticket.userId}>\n\`${ticket.username}\``,               inline: true },
        { name: `${e('mod') || '🛡️'}  Closed By`,     value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``,    inline: true },
        { name: `${e('calendar') || '📅'}  Opened At`, value: `\`${ticket.openedAt}\``,                                    inline: true },
        { name: `${e('calendar') || '📅'}  Closed At`, value: `\`${closedAt}\``,                                           inline: true },
        { name: `${e('clock') || '⏱️'}  Duration`,     value: `\`${duration ?? 'N/A'}\``,                                 inline: true },
        { name: `${e('log') || '🗂️'}  Category`,       value: `\`${categoryLabel(ticket.category)}\``,                    inline: true },
        ...specialNote,
        ...escalatedNote,
      ],
    });

    const logCh = await client.channels.fetch(process.env.TICKET_LOG_CHANNEL_ID).catch(() => null);
    if (logCh) {
      const logTranscript = new AttachmentBuilder(buf, { name: `${ticket.ticketId}.html` });
      await logCh.send({
        content: `${e('note') || '📄'}  Transcript for closed ticket **${ticket.ticketId}**:`,
        files: [logTranscript],
      }).catch(() => null);
    }

    setTimeout(() => interaction.channel.delete().catch(() => null), 10_000);
  },
};
