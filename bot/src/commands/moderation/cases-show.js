const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { getCases, getAllCases } = require('../../services/caseService');
const { colors, emojis } = require('../../config/config');
const { e } = require('../../utils/emoji');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

function padCase(id) {
  return String(id).padStart(4, '0');
}

const ACTION_SECTIONS = [
  { key: 'BAN',        label: 'Bans',           emojiKey: 'ban'     },
  { key: 'UNBAN',      label: 'Unbans',          emojiKey: 'unban'   },
  { key: 'KICK',       label: 'Kicks',           emojiKey: 'kick'    },
  { key: 'MUTE',       label: 'Mutes',           emojiKey: 'mute'    },
  { key: 'UNMUTE',     label: 'Unmutes',         emojiKey: 'unmute'  },
  { key: 'WARN',       label: 'Warnings',        emojiKey: 'warn'    },
  { key: 'UNWARN',     label: 'Unwarns',         emojiKey: 'success' },
  { key: 'NICK',       label: 'Nickname Changes',emojiKey: 'nick'    },
  { key: 'VC_MUTE',   label: 'VC Mutes',        emojiKey: 'voice'   },
  { key: 'VC_UNMUTE', label: 'VC Unmutes',      emojiKey: 'voice'   },
  { key: 'VC_DEAFEN', label: 'VC Deafens',      emojiKey: 'voice'   },
  { key: 'VC_UNDEAFEN',label: 'VC Undeafens',   emojiKey: 'voice'   },
  { key: 'VC_KICK',   label: 'VC Kicks',        emojiKey: 'kick'    },
  { key: 'VC_MOVE',   label: 'VC Moves',        emojiKey: 'voice'   },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases-show')
    .setDescription('View moderation cases')
    .addUserOption(o =>
      o.setName('user').setDescription('View cases for a specific user').setRequired(false),
    )
    .addIntegerOption(o =>
      o.setName('limit').setDescription('Number of cases to show (1–25)').setMinValue(1).setMaxValue(25).setRequired(false),
    ),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const limit      = interaction.options.getInteger('limit') ?? 25;

    const cases = targetUser
      ? await getCases(interaction.guildId, targetUser.id)
      : await getAllCases(interaction.guildId, limit);

    if (cases.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.moderation)
            .setTitle(`${e('case')}  No Cases Found`)
            .setDescription(
              targetUser
                ? `${e('success')} No moderation cases found for <@${targetUser.id}>.`
                : `${e('success')} No moderation cases found in this server.`,
            )
            .setFooter(makeFooter(client))
            .setTimestamp(),
        ],
      });
    }

    if (targetUser) {
      const embed = new EmbedBuilder()
        .setColor(colors.moderation)
        .setTitle(`${e('case')}  Case History — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `${e('member')} <@${targetUser.id}> · \`${targetUser.username}\` · \`${targetUser.id}\`\n` +
          `${e('log')} **${cases.length}** total case(s) on record\n\u200b`,
        )
        .setFooter(makeFooter(client))
        .setTimestamp();

      cases.slice(0, 15).forEach(c => {
        const section = ACTION_SECTIONS.find(s => s.key === c.action);
        const icon    = section ? e(section.emojiKey) : e('mod');
        const lines = [
          `${e('mod')} **Mod:** \`${c.moderatorTag}\``,
          `${e('log')} **Reason:** ${c.reason || 'No reason provided'}`,
          c.duration ? `${e('clock')} **Duration:** \`${c.duration}\`` : null,
          `${e('calendar')} **Date:** ${formatIST(c.createdAt)}`,
        ].filter(Boolean).join('\n');

        embed.addFields({
          name:  `${icon} Case #${padCase(c.caseId)} — ${c.action}`,
          value: lines,
          inline: false,
        });
      });

      if (cases.length > 15) {
        embed.addFields({
          name:  `${e('info')} More`,
          value: `+${cases.length - 15} more case(s) not shown. Use \`/cases-show limit:25\` to see more.`,
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Rulebook layout — grouped by action type ──────────────────────────────
    const grouped = {};
    for (const c of cases) {
      if (!grouped[c.action]) grouped[c.action] = [];
      grouped[c.action].push(c);
    }

    const embed = new EmbedBuilder()
      .setColor(colors.moderation)
      .setTitle(`${e('case')}  Moderation Case Book`)
      .setDescription(
        `${e('log')} **${cases.length}** case(s) on record — organised by action type.\n` +
        `Use \`/cases-show user:\` to filter by member.\n\u200b`,
      )
      .setFooter(makeFooter(client))
      .setTimestamp();

    let fieldCount = 0;
    for (const section of ACTION_SECTIONS) {
      const sectionCases = grouped[section.key];
      if (!sectionCases || sectionCases.length === 0) continue;
      if (fieldCount >= 24) break;

      const icon  = e(section.emojiKey);
      const lines = sectionCases.slice(0, 6).map(c =>
        `> **#${padCase(c.caseId)}** · \`${c.userTag}\` · ${c.reason?.slice(0, 40) || 'No reason'} · <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:d>`,
      ).join('\n');

      const extra = sectionCases.length > 6
        ? `\n*+${sectionCases.length - 6} more — use \`/cases-show\` with a user to see all*`
        : '';

      embed.addFields({
        name:  `${icon}  ${section.label} (${sectionCases.length})`,
        value: lines + extra,
        inline: false,
      });
      fieldCount++;
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
