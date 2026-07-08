const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { getAllCases } = require('../../services/caseService');
const { colors } = require('../../config/config');
const { discordTimestamp } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');
const { e } = require('../../utils/emoji');

// Action → accent colour (embed left bar)
const ACTION_COLORS = {
  BAN:       colors.error,
  KICK:      colors.error,
  WARN:      colors.warning,
  MUTE:      colors.warning,
  UNMUTE:    colors.success,
  UNBAN:     colors.success,
  VC_KICK:   colors.moderation,
  VC_MUTE:   colors.moderation,
  VC_DEAFEN: colors.moderation,
};

// Action → semantic emoji key
const ACTION_EMOJI_KEY = {
  BAN:       'ban',
  KICK:      'kick',
  WARN:      'warn',
  MUTE:      'mute',
  UNMUTE:    'unmute',
  UNBAN:     'unban',
  VC_KICK:   'voice',
  VC_MUTE:   'mute',
  VC_DEAFEN: 'voice',
};

// Human-readable action label
const ACTION_LABEL = {
  BAN:       'Ban',
  KICK:      'Kick',
  WARN:      'Warn',
  MUTE:      'Mute',
  UNMUTE:    'Unmute',
  UNBAN:     'Unban',
  VC_KICK:   'VC Kick',
  VC_MUTE:   'VC Mute',
  VC_DEAFEN: 'VC Deafen',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('View recent moderation actions performed by server staff')
    .addIntegerOption(o =>
      o.setName('limit')
        .setDescription('Number of cases to show (1–25, default 10)')
        .setMinValue(1).setMaxValue(25).setRequired(false),
    )
    .addUserOption(o =>
      o.setName('moderator')
        .setDescription('Filter by a specific moderator')
        .setRequired(false),
    )
    .addStringOption(o =>
      o.setName('action')
        .setDescription('Filter by action type')
        .addChoices(
          { name: 'Ban',      value: 'BAN'      },
          { name: 'Kick',     value: 'KICK'     },
          { name: 'Warn',     value: 'WARN'     },
          { name: 'Mute',     value: 'MUTE'     },
          { name: 'Unmute',   value: 'UNMUTE'   },
          { name: 'Unban',    value: 'UNBAN'    },
          { name: 'VC Kick',  value: 'VC_KICK'  },
        )
        .setRequired(false),
    ),
  cooldown: 5000,

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!await checkAdminRole(interaction)) return;

    const limit     = interaction.options.getInteger('limit') ?? 10;
    const modFilter = interaction.options.getUser('moderator');
    const actFilter = interaction.options.getString('action');

    let cases = await getAllCases(interaction.guildId, 50);
    if (modFilter) cases = cases.filter(c => c.moderatorId === modFilter.id);
    if (actFilter) cases = cases.filter(c => c.action    === actFilter);
    cases = cases.slice(0, limit);

    // ── Empty state ─────────────────────────────────────────────────────────────
    if (!cases.length) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(colors.neutral)
        .setAuthor({
          name:    `${interaction.guild.name} · Audit Log`,
          iconURL: interaction.guild.iconURL({ extension: 'png', size: 64 }) ?? undefined,
        })
        .setDescription(
          `${e('log')}  No moderation actions found` +
          (modFilter ? ` by **${modFilter.username}**` : '') +
          (actFilter ? ` of type **${ACTION_LABEL[actFilter] ?? actFilter}**` : '') + '.',
        )
        .setFooter(makeFooter(client))
        .setTimestamp();
      return interaction.editReply({ embeds: [emptyEmbed] });
    }

    // ── Case lines ──────────────────────────────────────────────────────────────
    // Format: [emoji] `#0012` **Ban** · <@user> · mod: <@mod> · 3h ago
    //         > reason text (truncated)
    const lines = cases.map(c => {
      const icon    = e(ACTION_EMOJI_KEY[c.action]) || '•';
      const caseId  = `\`#${String(c.caseId).padStart(4, '0')}\``;
      const label   = ACTION_LABEL[c.action] ?? c.action;
      const time    = discordTimestamp(c.createdAt, 'R');
      const reason  = (c.reason ?? 'No reason').length > 72
        ? (c.reason ?? 'No reason').slice(0, 69) + '…'
        : (c.reason ?? 'No reason');
      return (
        `${icon} ${caseId} **${label}** · <@${c.userId}> · mod: <@${c.moderatorId}> · ${time}\n` +
        `> ${reason}`
      );
    });

    // ── Summary breakdown ───────────────────────────────────────────────────────
    const counts = {};
    for (const c of cases) counts[c.action] = (counts[c.action] || 0) + 1;
    const summaryParts = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([action, n]) => {
        const icon = e(ACTION_EMOJI_KEY[action]) || '';
        return `${icon} **${n}** ${ACTION_LABEL[action] ?? action}`;
      });

    // ── Filter context line ─────────────────────────────────────────────────────
    const filterBits = [];
    if (modFilter) filterBits.push(`moderator: **${modFilter.username}**`);
    if (actFilter) filterBits.push(`action: **${ACTION_LABEL[actFilter] ?? actFilter}**`);

    // ── Embed colour: action-specific when filtered, default otherwise ──────────
    const accentColor = actFilter
      ? (ACTION_COLORS[actFilter] ?? colors.moderation)
      : colors.moderation;

    // ── Build embed ─────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(accentColor)
      .setAuthor({
        name:    `${interaction.guild.name} · Audit Log`,
        iconURL: interaction.guild.iconURL({ extension: 'png', size: 64 }) ?? undefined,
      })
      .setTitle(
        `${e('log')}  Last ${cases.length} Action${cases.length !== 1 ? 's' : ''}` +
        (filterBits.length ? `  ·  ${filterBits.join('  ·  ')}` : ''),
      )
      .setDescription(lines.join('\n\n'));

    if (summaryParts.length > 1) {
      embed.addFields({
        name:   `${e('stats') || '📊'}  Breakdown`,
        value:  summaryParts.join('   '),
        inline: false,
      });
    }

    embed
      .setFooter(makeFooter(
        client,
        modFilter
          ? `Filtered by ${modFilter.username}  ·  ${cases.length} result${cases.length !== 1 ? 's' : ''}`
          : `${cases.length} result${cases.length !== 1 ? 's' : ''}`,
      ))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
