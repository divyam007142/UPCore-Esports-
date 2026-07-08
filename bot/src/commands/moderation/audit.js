const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { getAllCases } = require('../../services/caseService');
const { colors, emojis } = require('../../config/config');
const { discordTimestamp } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

const ACTION_COLORS = {
  BAN:      colors.error,
  KICK:     colors.error,
  WARN:     colors.warning,
  MUTE:     colors.warning,
  UNMUTE:   colors.success,
  UNBAN:    colors.success,
  VC_KICK:  colors.moderation,
  VC_MUTE:  colors.moderation,
  VC_DEAFEN: colors.moderation,
};

const ACTION_EMOJI = {
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('View recent moderation actions performed by server staff')
    .addIntegerOption(o =>
      o.setName('limit')
        .setDescription('Number of cases to show (1–25, default 10)')
        .setMinValue(1).setMaxValue(25).setRequired(false)
    )
    .addUserOption(o =>
      o.setName('moderator')
        .setDescription('Filter by a specific moderator')
        .setRequired(false)
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
        .setRequired(false)
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
    if (actFilter) cases = cases.filter(c => c.action === actFilter);

    cases = cases.slice(0, limit);

    if (!cases.length) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.neutral)
          .setTitle(`${emojis.log}  Audit Log`)
          .setDescription('No moderation actions found matching your filters.')
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    const lines = cases.map(c => {
      const actionEmoji = emojis[ACTION_EMOJI[c.action]] || emojis.log;
      const caseId = `\`#${String(c.caseId).padStart(4, '0')}\``;
      const time   = discordTimestamp(c.createdAt, 'R');
      return `${actionEmoji} ${caseId} **${c.action}** — <@${c.userId}> by <@${c.moderatorId}> ${time}\n> ${c.reason}`;
    });

    const embed = new EmbedBuilder()
      .setColor(colors.moderation)
      .setTitle(`${emojis.log}  Audit Log — Last ${cases.length} Action${cases.length !== 1 ? 's' : ''}`)
      .setDescription(lines.join('\n\n'))
      .setFooter(makeFooter(client, modFilter ? `Filtered by ${modFilter.username}` : `${cases.length} result${cases.length !== 1 ? 's' : ''}`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
