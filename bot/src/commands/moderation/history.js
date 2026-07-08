const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { getCases } = require('../../services/caseService');
const Warning = require('../../models/Warning');
const { colors, emojis } = require('../../config/config');
const { discordTimestamp } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

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
    .setName('history')
    .setDescription("Display a member's complete moderation history")
    .addUserOption(o =>
      o.setName('user').setDescription('The member to look up').setRequired(true)
    ),
  cooldown: 4000,

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!await checkAdminRole(interaction)) return;

    const targetUser = interaction.options.getUser('user');

    const [cases, warningDoc] = await Promise.all([
      getCases(interaction.guildId, targetUser.id),
      Warning.findOne({ guildId: interaction.guildId, userId: targetUser.id }),
    ]);

    const activeWarnings = warningDoc?.warnings?.filter(w => w.active !== false).length ?? 0;

    if (!cases.length) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(colors.success)
          .setTitle(`${emojis.case}  Moderation History`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setDescription(`${emojis.check}  **${targetUser.tag}** has a clean record — no moderation actions found.`)
          .setFooter(makeFooter(client))
          .setTimestamp()],
      });
    }

    const lines = cases.slice(0, 15).map(c => {
      const actionEmoji = emojis[ACTION_EMOJI[c.action]] || emojis.log;
      const caseId = `\`#${String(c.caseId).padStart(4, '0')}\``;
      const time   = discordTimestamp(c.createdAt, 'R');
      return `${actionEmoji} ${caseId} **${c.action}** by <@${c.moderatorId}> ${time}\n> ${c.reason}`;
    });

    const embed = new EmbedBuilder()
      .setColor(cases.length ? colors.warning : colors.success)
      .setTitle(`${emojis.case}  Moderation History`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(lines.join('\n\n'))
      .addFields(
        { name: `${emojis.member} User`,             value: `<@${targetUser.id}>\n\`${targetUser.tag}\`\n\`${targetUser.id}\``, inline: true },
        { name: `${emojis.case} Total Cases`,         value: `\`${cases.length}\``, inline: true },
        { name: `${emojis.warn} Active Warnings`,     value: `\`${activeWarnings}\``, inline: true },
      )
      .setFooter(makeFooter(client, cases.length > 15 ? `Showing 15 of ${cases.length} cases` : `${cases.length} case${cases.length !== 1 ? 's' : ''} total`))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
