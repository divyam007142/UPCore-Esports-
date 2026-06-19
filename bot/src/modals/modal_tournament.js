const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const Ticket = require('../models/Ticket');
const TicketBlacklist = require('../models/TicketBlacklist');
const GuildConfig = require('../models/GuildConfig');
const { logTicketAction } = require('../utils/ticketLogger');
const { resolveTicketCategory } = require('../utils/ticketCategories');
const { e } = require('../utils/emoji');
const { translateToEnglish, fieldValue } = require('../utils/ticketTranslate');

const IST = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

module.exports = {
  id: 'modal_tournament',
  async execute(interaction, client) {
    const bl = await TicketBlacklist.findOne({ guildId: interaction.guild.id, userId: interaction.user.id }).catch(() => null);
    if (bl) return interaction.reply({ content: `${e('error') || '❌'}  You are blacklisted from opening tickets.\n**Reason:** ${bl.reason}`, ephemeral: true });

    const existing = await Ticket.findOne({ guildId: interaction.guild.id, userId: interaction.user.id, status: 'open' }).catch(() => null);
    if (existing) return interaction.reply({ content: `${e('warning') || '⚠️'}  You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });

    const category = await resolveTicketCategory(interaction, 'tournament');
    if (!category) return;

    const teamName = interaction.fields.getTextInputValue('team_name');
    const issue          = interaction.fields.getTextInputValue('issue');
    const matchNo        = interaction.fields.getTextInputValue('match_id') || 'Not provided';
    const evidence       = interaction.fields.getUploadedFiles('evidence', false)?.first() ?? null;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { $inc: { 'ticket.counter': 1 } },
      { upsert: true, new: true }
    );
    const counter    = config.ticket?.counter ?? 1;
    const ticketId   = `ticket-${String(counter).padStart(4, '0')}`;
    const ticketNum  = String(((counter - 1) % 99) + 1).padStart(2, '0');
    const openedAt   = IST();
    const supportRid = process.env.TICKET_SUPPORT_ROLE_ID;

    await interaction.deferReply({ ephemeral: true });

    // ── Auto-translate non-English answers to English ────────────────────────
    const { results: [tName, tIssue], anyTranslated } = await translateToEnglish([teamName, issue]);

    const displayName  = tName.text;
    const displayIssue = tIssue.text;

    const ch = await interaction.guild.channels.create({
      name: `〚${ticketNum}〛『event-support』`,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny:  ['ViewChannel'] },
        { id: interaction.user.id,              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
        { id: client.user.id,                   allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles'] },
        ...(supportRid ? [{ id: supportRid,     allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'AttachFiles'] }] : []),
      ],
    });

    await Ticket.create({
      channelId: ch.id, guildId: interaction.guild.id, ticketId,
      ticketNumber: counter, userId: interaction.user.id,
      username: interaction.user.tag, category: 'tournament',
      originalCategoryId: category.id,
      status: 'open', openedAt,
      formData: {
        'Team Name': teamName,
        'Match No': matchNo,
        'Issue / Description': issue,
        ...(evidence ? { Evidence: evidence.url } : {}),
      },
    });

    const banner = new AttachmentBuilder(path.join(__dirname, '../../assets/banner.gif'), { name: 'banner.gif' });

    // ── Main ticket embed ────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x0f0f23)
      .setAuthor({ name: 'UPC Support', iconURL: client.user.displayAvatarURL() })
      .setTitle(`${e('case') || '🎫'}  Ticket Opened`)
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        `Hey <@${interaction.user.id}>, thank you for contacting support.\n\n` +
        `${e('target') || '🔍'}  **Reason:** \`Tournament Support\`\n` +
        `${e('clock') || '⏱️'}  Please wait patiently while our team responds.`
      )
      .setImage('attachment://banner.gif')
      .setFooter({ text: 'UPCore  •  Support  |  #RiseUP' });

    // ── Form answers embed ───────────────────────────────────────────────────
    const formEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e('note') || '📋'}  Submitted Information`)
      .addFields(
        { name: `${e('tournament') || '🏆'}  Your Team Name`,   value: fieldValue(tName),  inline: false },
        { name: `${e('target') || '🎯'}  Match No`,              value: matchNo.slice(0, 256), inline: true },
        { name: `${e('info') || 'ℹ️'}  Issue / Description`,     value: fieldValue(tIssue), inline: false },
        { name: `${e('screenshot') || '📸'}  Evidence`, value: evidence ? `[View Attachment](${evidence.url})` : '`Not provided`', inline: true },
      )
      .setFooter({ text: `UPCore  •  Tournament Support  •  User Submission${anyTranslated ? '  •  Auto-translated to English' : ''}` });

    const addBtn   = new ButtonBuilder().setCustomId('btn_add').setLabel('Add User').setStyle(ButtonStyle.Secondary);
    const closeBtn = new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setStyle(ButtonStyle.Danger);
    const addE  = e('member') || '➕';
    const lockE = e('lock')   || '🔒';
    if (addE)  addBtn.setEmoji(addE);
    if (lockE) closeBtn.setEmoji(lockE);

    const row = new ActionRowBuilder().addComponents(addBtn, closeBtn);
    const mention = [`<@${interaction.user.id}>`, supportRid ? `<@&${supportRid}>` : ''].filter(Boolean).join(' ');
    await ch.send({ content: mention, embeds: [embed, formEmbed], components: [row], files: [banner] });

    // ── Forward evidence screenshot if submitted ──────────────────────────────
    if (evidence) {
      const evidenceEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e('screenshot') || '📸'}  Match Evidence`)
        .setDescription(
          `${e('member') || '👤'}  Submitted by <@${interaction.user.id}>\n` +
          `${e('tournament') || '🏆'}  Team name: \`${teamName}\`\n` +
          `${e('target') || '🎯'}  Match No: \`${matchNo}\``
        )
        .setImage(evidence.url)
        .setFooter({ text: 'UPCore  •  Tournament Support' });
      await ch.send({ embeds: [evidenceEmbed] });
    }

    await interaction.editReply({ content: `${e('success') || '✅'}  Your tournament ticket has been opened: <#${ch.id}>` });

    await logTicketAction(client, 'TICKET_OPEN', {
      title: `Ticket Opened  •  ${ticketId}`,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: `${e('case') || '🎫'}  Ticket ID`,         value: `\`${ticketId}\``,                                             inline: true  },
        { name: `${e('member') || '👤'}  Opened By`,        value: `<@${interaction.user.id}>\n\`${interaction.user.tag}\``,     inline: true  },
        { name: `${e('log') || '🗂️'}  Category`,            value: '`Tournament Support`',                                       inline: true  },
        { name: `${e('channel') || '#'}  Channel`,          value: `<#${ch.id}>`,                                                inline: true  },
        { name: `${e('calendar') || '📅'}  Opened At`,      value: `\`${openedAt}\``,                                            inline: true  },
        { name: `${e('screenshot') || '📸'}  Evidence`,     value: evidence ? `[View](${evidence.url})` : '`Not provided`',     inline: true  },
        { name: `${e('tournament') || '🏆'}  Team Name`,     value: `\`\`\`${teamName.slice(0, 900)}\`\`\``,                   inline: false },
      ],
    });
  },
};
