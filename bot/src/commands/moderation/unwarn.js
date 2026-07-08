const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const Warning = require('../../models/Warning');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a member')
    .addUserOption(o => o.setName('user').setDescription('The user to unwarn').setRequired(true))
    .addIntegerOption(o => o.setName('warn_id').setDescription('Warning No for eg#1 to remove (use /warnings to see IDs)').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    const warnId     = interaction.options.getInteger('warn_id');

    const warningDoc = await Warning.findOne({ guildId: interaction.guildId, userId: targetUser.id });
    if (!warningDoc || warningDoc.warnings.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setTitle(`${emojis.warn}  No Warnings Found`)
          .setDescription(`**${targetUser.tag}** has no warnings on record.`)
          .addFields({ name: `${emojis.info} Tip`, value: 'Use `/warnings` to view all active warnings for a user.', inline: false })
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }

    const warning = warningDoc.warnings.find(w => w.warnId === warnId && w.active);
    if (!warning) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(colors.error)
          .setTitle(`${emojis.error}  Warning Not Found`)
          .setDescription(`Warning \`#${warnId}\` was not found or has already been removed.`)
          .addFields({ name: `${emojis.info} Tip`, value: 'Use `/warnings` to see the correct warning IDs.', inline: false })
          .setFooter(makeFooter(client))
          .setTimestamp()],
        ephemeral: true,
      });
    }

    warning.active = false;
    await warningDoc.save().catch(err => { throw new Error(`Failed to save warning update: ${err.message}`); });

    const activeRemaining = warningDoc.warnings.filter(w => w.active).length;

    const newCase = await createCase(interaction.guildId, {
      action: 'UNWARN', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag,
      reason: `Removed warning #${warnId}`,
    });

    await logModAction(client, interaction.guild, {
      action: 'UNWARN', target: targetUser.tag, targetId: targetUser.id,
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason: `Removed warning #${warnId}`, caseId: newCase.caseId,
    });

    const embed = new EmbedBuilder()
      .setColor(colors.success)
      .setDescription(
        `${emojis.success}  **Warning #${warnId} removed** — <@${targetUser.id}> · \`${activeRemaining}\` active\n` +
        `${emojis.log}  ${warning.reason}`
      )
      .setFooter(makeFooter(client, `by ${interaction.user.username}`))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
