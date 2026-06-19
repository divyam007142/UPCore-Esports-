const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminRole } = require('../../utils/permissions');
const { createCase } = require('../../services/caseService');
const { logModAction } = require('../../services/logService');
const Warning = require('../../models/Warning');
const { colors, emojis } = require('../../config/config');
const { formatIST } = require('../../utils/time');
const { makeFooter } = require('../../utils/embeds');

const WARN_THRESHOLDS = { 3: 'Approaching mute threshold', 5: 'Approaching ban threshold' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),
  cooldown: 3000,

  async execute(interaction, client) {
    if (!await checkAdminRole(interaction)) return;

    const targetUser = interaction.options.getUser('user');
    const reason     = interaction.options.getString('reason');

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(colors.error).setTitle(`${emojis.error}  Cannot Warn Yourself`).setDescription('You cannot warn yourself.').setFooter(makeFooter(client)).setTimestamp()],
        ephemeral: true,
      });
    }

    let warningDoc = await Warning.findOne({ guildId: interaction.guildId, userId: targetUser.id });
    if (!warningDoc) {
      warningDoc = new Warning({ guildId: interaction.guildId, userId: targetUser.id, userTag: targetUser.tag, warnings: [] });
    }

    const warnId   = warningDoc.warnings.length + 1;
    warningDoc.warnings.push({ warnId, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason });
    await warningDoc.save().catch(err => { throw new Error(`Failed to save warning: ${err.message}`); });

    const activeCount  = warningDoc.warnings.filter(w => w.active).length;
    const thresholdMsg = WARN_THRESHOLDS[activeCount] || null;

    const newCase = await createCase(interaction.guildId, {
      action: 'WARN', userId: targetUser.id, userTag: targetUser.tag,
      moderatorId: interaction.user.id, moderatorTag: interaction.user.tag, reason,
    });

    await logModAction(client, interaction.guild, {
      action: 'WARN', target: targetUser.tag, targetId: targetUser.id,
      targetAvatar: targetUser.displayAvatarURL({ dynamic: true }),
      moderator: interaction.user.tag, moderatorId: interaction.user.id,
      reason, caseId: newCase.caseId,
    });

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle(`${emojis.warn}  You have been Warned`)
        .setDescription(`You have received a warning in **${interaction.guild.name}**.`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: `${emojis.log} Reason`,          value: reason },
          { name: `${emojis.case} Warning #`,       value: `\`${warnId}\``, inline: true },
          { name: `${emojis.warning} Total Warns`,  value: `\`${activeCount}\``, inline: true },
        )
        .setFooter({ text: 'UPCORE Esports — Please review the server rules to avoid further warnings' })
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch { }

    const embed = new EmbedBuilder()
      .setColor(colors.warning)
      .setTitle(`${emojis.warn}  Member Warned`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${emojis.member} User`,         value: `<@${targetUser.id}>\n\`${targetUser.tag}\`\n\`${targetUser.id}\``, inline: true },
        { name: `${emojis.case} Warning #`,      value: `\`${warnId}\``, inline: true },
        { name: `${emojis.log} Reason`,          value: reason, inline: false },
        { name: `${emojis.warning} Total Warns`, value: `\`${activeCount}\` active`, inline: true },
        { name: `${emojis.case} Case ID`,        value: `\`#${String(newCase.caseId).padStart(4,'0')}\``, inline: true },
        { name: `${emojis.calendar} Time (IST)`, value: formatIST(), inline: true },
      );

    if (thresholdMsg) {
      embed.addFields({ name: `${emojis.warning} Notice`, value: thresholdMsg, inline: false });
    }

    embed.setFooter(makeFooter(client, `Case #${String(newCase.caseId).padStart(4,'0')}`)).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
